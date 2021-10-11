compile:
	deno compile --allow-read --allow-write --allow-run easylang.js

test:
	./easylang tests.el && ./tests
