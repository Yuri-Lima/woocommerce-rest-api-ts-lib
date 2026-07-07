.PHONY: test typecheck build ui coverage

test:
	pnpm test

typecheck:
	pnpm run typecheck

build:
	pnpm run build

coverage:
	pnpm test

# Open the coverage/bug dashboard (starts local static server when possible).
ui:
	chmod +x scripts/open-ui.sh
	./scripts/open-ui.sh
