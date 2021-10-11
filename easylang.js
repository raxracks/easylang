import * as Colors from "https://deno.land/std/fmt/colors.ts";
import * as distance from "https://deno.land/x/damerau_levenshtein/mod.ts";

let SYSCALLS = {
	"WRITE_SYSCALL": 0x4,
	"EXIT_SYSCALL": 0x1,
	"READ_SYSCALL": 0x3
}

let ASSEMBLY_BOILERPLATE = `global _start

section .text:
`;

let PRINT_FUNCTION = `PRINT:
	mov eax, ${SYSCALLS.WRITE_SYSCALL}
	mov ebx, 0x0
	int 0x80
	ret
`;

let EXIT_FUNCTION = `EXIT:
	mov eax, ${SYSCALLS.EXIT_SYSCALL}
	mov ebx, 0x0
	int 0x80
	ret
`;

let ASK_FUNCTION = `ASK:
	mov eax, ${SYSCALLS.READ_SYSCALL}
    	mov ebx, 0
   	mov edx, 100
    	int 0x80
    	ret
`;

let data = [];
let text = [];
let variableNames = [];
let variables = [];
let outOfScopeVariableNames = [];

let inputFileName = Deno.args[0];
let outputAssemblyFileName = inputFileName.split(".")[0] + ".asm";
let outputObjectFileName = inputFileName.split(".")[0] + ".o";
let outputBinary = inputFileName.split(".")[0];

let fileContents = await Deno.readTextFile(inputFileName);

let lines = fileContents.split("\n");

function prepareText() {
	text.push(PRINT_FUNCTION);
	text.push(EXIT_FUNCTION);
	text.push(ASK_FUNCTION);
	text.push("_start:");
}

prepareText();

function findClosestMatch(toMatch, data) {
	let returnArray = [];

	distance.sortByMinDistance(distance.distanceList(toMatch, data)).forEach(d => {
		if(d.distance < toMatch.length) {
			returnArray.push(d.compared);
		}	
	});

	return returnArray;
}

function HandleUndefined(i, proceedingSections) {
	console.error(`
	${Colors.red("Oh no!")}
	Seems like something went wrong, but don't worry.
	
	On ${Colors.yellow("line " + (i + 1).toString())} you said ${Colors.red(proceedingSections)},
	but I don't understand what ${Colors.red(proceedingSections)} means. Did you forget quotes?
	
	Did you mean:
	${findClosestMatch(proceedingSections, variableNames).join("\n	")}
	`);
};

function HandleNotImplemented(i, feature) {
	console.error(`
	${Colors.red("Oh no!")}
	Seems like something went wrong, but don't worry.
		
	On ${Colors.yellow("line " + (i + 1).toString())} you used ${Colors.red(feature)},
	but that feature is not implemented.
		`);
}

function GenerateVariableString() {
	let returnValue = "";

	variables.forEach(v => {
		returnValue += `let ${v[0]} = "${v[1]}";\n`;	
	});

	return returnValue;
}

for(let i = 0; i < lines.length; i++) {
	let line = lines[i];

	let sections = line.split(" ");

	let operation = sections[0];

	let proceedingSections = line.slice(operation.length + 1);

	switch(operation) {
		case "say":
			if(variableNames.includes(proceedingSections)) {
				let position = data.length / 2;
	
				text.push(`	mov ecx, variable_${position}`);
				text.push(`	mov edx, variable_${position}_len`);
				text.push(`	call PRINT`);
	
				let returnValue = "";
			
				try {
					returnValue = eval(GenerateVariableString() + proceedingSections);
				} catch(e) {
					HandleUndefined(i, proceedingSections);
					Deno.exit();
				}

				data.push(`	variable_${position}: db "${returnValue}", 0xA`);
				data.push(`	variable_${position}_len equ $-variable_${position}`);
			} else if(outOfScopeVariableNames.includes(proceedingSections)) {
				text.push(`	mov ecx, ${proceedingSections}`);
				text.push(`	mov edx, 100`);
				text.push(`	call PRINT`);
			} else {
				HandleUndefined(i, proceedingSections);
			}
			
			break;

		case "ask":
			let question = proceedingSections.split('"')[1];

			let destinationVariable = proceedingSections.slice(question.length + 15);

			console.log(`Destination: ${destinationVariable}`);

			outOfScopeVariableNames.push(destinationVariable);

			data.push(`	${destinationVariable}: times 100 db 0`);

			text.push(`	mov ecx, ${destinationVariable}`);
			text.push(`	call ASK`);
		
			break;
			
		case "now":
			let action = sections[2];

			switch(action) {
				case "means":
					let variableName = sections[1];
					let variableValue = eval(proceedingSections.slice(variableName.length + 1 + action.length + 1));

					variableNames.push(variableName);

					variables.push([variableName, variableValue]);
					
					break;

				default:
					HandleNotImplemented(i, action);
					Deno.exit();
			}
			
			break;
	};
};

text.push(`
	call EXIT
`);

let outputAssembly = "";

outputAssembly += ASSEMBLY_BOILERPLATE;

outputAssembly += text.join("\n");

outputAssembly += `
section .data:
`

outputAssembly += data.join("\n");

Deno.writeTextFile(outputAssemblyFileName, outputAssembly);

let nasmTask = Deno.run({ cmd: ["nasm", "-f", "elf32", outputAssemblyFileName, "-o", outputObjectFileName] });

await nasmTask.status();

let linkerTask = Deno.run({ cmd: ["ld", "-m", "elf_i386", outputObjectFileName, "-o", outputBinary] });

await linkerTask.status();

//Deno.remove(outputAssemblyFileName);
Deno.remove(outputObjectFileName);
