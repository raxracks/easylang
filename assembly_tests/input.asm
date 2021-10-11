global _start

section .data
    str: times 100 db 0

section .text

_start:
    mov eax, 3
    mov ebx, 0
    mov ecx, str
   	mov edx, 100
    int 0x80

    mov eax, 4
    mov ebx, 1
    mov ecx, str
    mov edx, 100
    int 0x80

    mov eax, 1
    mov ebx, 0
    int 0x80
