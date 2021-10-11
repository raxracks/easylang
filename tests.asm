global _start

section .text:
PRINT:
	mov eax, 4
	mov ebx, 0x0
	int 0x80
	ret

EXIT:
	mov eax, 1
	mov ebx, 0x0
	int 0x80
	ret

ASK:
	mov eax, 3
    	mov ebx, 0
   	mov edx, 100
    	int 0x80
    	ret

_start:
	mov ecx, hello
	call ASK
	mov ecx, hello
	mov edx, 100
	call PRINT

	call EXIT

section .data:
	hello: times 100 db 0