import { hash } from "ohash";
import type { Nitro } from "../../types";
import { virtual } from "./virtual";

const unique = (arr: any[]) => [...new Set(arr)];
const getImportId = (p: string, lazy?: boolean) =>
  (lazy ? "_lazy_" : "_") + hash(p).slice(0, 6);

export function handlers(nitro: Nitro) {
  return virtual(
    {
      "#internal/nitro/virtual/server-handlers": () => {
        const handlers = [...nitro.scannedHandlers, ...nitro.options.handlers];
        if (nitro.options.serveStatic) {
          handlers.unshift({
            middleware: true,
            handler: "#internal/nitro/static",
          });
        }
        if (nitro.options.renderer) {
          handlers.push({
            route: "/**",
            lazy: true,
            handler: nitro.options.renderer,
          });
        }

        // If this handler would render a cached route rule then we can also inject a cached event handler
        for (const rule in nitro.options.routeRules) {
          // We can ignore this rule
          if (!nitro.options.routeRules[rule].cache) {
            continue;
          }
          for (const [index, handler] of handlers.entries()) {
            // skip middleware
            if (!handler.route) {
              continue;
            }
            // we will correctly register this rule as a cached route anyway
            if (handler.route === rule) {
              break;
            }
            // We are looking for handlers that will render a route _despite_ not
            // having an identical path to it
            if (!handler.route.endsWith("/**")) {
              continue;
            }
            if (!rule.startsWith(handler.route.replace("/**", ""))) {
              continue;
            }
            handlers.splice(index, 0, {
              ...handler,
              route: rule,
            });
            break;
          }
        }

        // Imports take priority
        const imports = unique(
          handlers.filter((h) => !h.lazy).map((h) => h.handler)
        );

        // Lazy imports should fill in the gaps
        // TODO: At least warn if a handler is imported both lazy and non lazy
        const lazyImports = unique(
          handlers.filter((h) => h.lazy).map((h) => h.handler)
        );

        const code = `
${imports
  .map((handler) => `import ${getImportId(handler)} from '${handler}';`)
  .join("\n")}

${lazyImports
  .map(
    (handler) =>
      `const ${getImportId(handler, true)} = () => import('${handler}');`
  )
  .join("\n")}

export const handlers = [
${handlers
  .map(
    (h) =>
      `  { route: '${h.route || ""}', handler: ${getImportId(
        h.handler,
        h.lazy
      )}, lazy: ${!!h.lazy}, middleware: ${!!h.middleware}, method: ${JSON.stringify(
        h.method
      )} }`
  )
  .join(",\n")}
];
  `.trim();
        return code;
      },
    },
    nitro.vfs
  );
}
