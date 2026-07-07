.PHONY: test typecheck build ui ui-presentation coverage

test:
	pnpm test

typecheck:
	pnpm run typecheck

build:
	pnpm run build

coverage:
	pnpm test

# Open the MCP tool explorer dashboard (starts local static server when possible).
# make ui              → tool explorer
# make ui-presentation → developer slide deck
ui:
	chmod +x scripts/open-ui.sh
	./scripts/open-ui.sh

ui-presentation:
	chmod +x scripts/open-ui.sh
	./scripts/open-ui.sh presentation
