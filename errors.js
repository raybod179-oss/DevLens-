/**
 * DevLens — Rule dataset
 * ----------------------------------------------------------------
 * Pure data. Each rule is matched against raw error/stack-trace text
 * by js/rules.js (the Rule Engine). No network calls, no API keys —
 * this is what lets DevLens run entirely offline / for free.
 *
 * Rule shape:
 *  id            unique string
 *  language      canonical language/framework key (see LANGUAGES below)
 *  type          short error type label shown in the result card
 *  severity      'info' | 'warning' | 'error' | 'critical'
 *  test          RegExp tested against the raw input
 *  cause         string OR function(match) -> string
 *  solution      string OR function(match) -> string
 *  simple        one-sentence "Explain Simply" version
 *  fix           optional function(match) -> { before, after } code lines
 */

window.DEVLENS_LANGUAGES = [
  { key: 'auto',       label: 'Auto Detect' },
  { key: 'javascript', label: 'JavaScript' },
  { key: 'typescript', label: 'TypeScript' },
  { key: 'react',      label: 'React' },
  { key: 'vue',        label: 'Vue' },
  { key: 'html',       label: 'HTML' },
  { key: 'css',        label: 'CSS' },
  { key: 'php',        label: 'PHP' },
  { key: 'laravel',    label: 'Laravel' },
  { key: 'node',       label: 'Node.js' },
  { key: 'python',     label: 'Python' },
  { key: 'java',       label: 'Java' },
  { key: 'csharp',     label: 'C#' },
  { key: 'sql',        label: 'SQL' },
  { key: 'json',       label: 'JSON' },
  { key: 'git',        label: 'Git / GitHub' },
];

window.DEVLENS_RULES = [

  /* ---------------------------- JavaScript ---------------------------- */
  {
    id: 'js-undefined-prop',
    language: 'javascript', type: 'TypeError', severity: 'error',
    test: /Cannot read propert(?:y|ies) (?:'(\w+)' )?of undefined(?:\s*\(reading '(\w+)'\))?/i,
    cause: (m) => { const prop = m[1] || m[2]; return `Code is trying to access the property${prop ? ` "${prop}"` : ''} on a value that is currently \`undefined\`. This usually means a variable was never assigned, an object was expected but never returned, or an async value was read before it finished loading.`; },
    solution: (m) => { const prop = m[1] || m[2] || 'prop'; return `Guard the access before reading the property — e.g. check the value exists, use optional chaining (\`obj?.${prop}\`), or trace back to where the variable should have been assigned.`; },
    simple: 'You are trying to use something before it actually exists.',
    fix: (m) => { const prop = m[1] || m[2] || 'name'; return { before: `console.log(user.${prop});`, after: `console.log(user?.${prop});` }; },
  },
  {
    id: 'js-null-prop',
    language: 'javascript', type: 'TypeError', severity: 'error',
    test: /Cannot read propert(?:y|ies) (?:'(\w+)' )?of null(?:\s*\(reading '(\w+)'\))?/i,
    cause: (m) => { const prop = m[1] || m[2]; return `The code expected an object but got \`null\`, then tried to read${prop ? ` "${prop}"` : ' a property'} from it. This is common after a failed DOM query (\`document.querySelector\`) or an API call that returned no result.`; },
    solution: () => 'Confirm the selector or lookup actually matches something before using it, or add a null-check / optional chaining.',
    simple: 'The thing you are working with turned out to be empty, and the code tried to use it anyway.',
    fix: (m) => { const prop = m[1] || m[2] || 'value'; return { before: `el.${prop} = 1;`, after: `if (el) el.${prop} = 1;` }; },
  },
  {
    id: 'js-not-a-function',
    language: 'javascript', type: 'TypeError', severity: 'error',
    test: /(\w+(?:\.\w+)*) is not a function/i,
    cause: (m) => `\`${m[1]}\` was called like a function, but it isn't one at this point — often because it's \`undefined\`, misspelled, not yet imported, or was overwritten by a non-function value earlier in the code.`,
    solution: (m) => `Check the import/definition of \`${m[1]}\`, verify spelling, and confirm nothing else in the file reassigns it before this line.`,
    simple: 'You tried to run something as a function, but it isn\'t actually a function.',
  },
  {
    id: 'js-not-defined',
    language: 'javascript', type: 'ReferenceError', severity: 'error',
    test: /(\w+) is not defined/i,
    cause: (m) => `\`${m[1]}\` is referenced but was never declared or imported in this scope.`,
    solution: (m) => `Declare \`${m[1]}\` with \`let\`/\`const\`, or add the missing \`import\`. Check for a typo in the identifier name.`,
    simple: 'The code is using a name that was never created.',
  },
  {
    id: 'js-json-parse',
    language: 'javascript', type: 'SyntaxError', severity: 'error',
    test: /Unexpected token .* in JSON at position (\d+)/i,
    cause: (m) => `\`JSON.parse()\` received text that isn't valid JSON — the malformed part is around character ${m[1]}. Often this happens when the "JSON" is actually an HTML error page or an empty response.`,
    solution: () => 'Log the raw string before parsing it, confirm the server actually returned JSON (check Content-Type and status code), and validate the payload.',
    simple: 'The text you tried to read as JSON isn\'t actually valid JSON.',
  },
  {
    id: 'js-max-call-stack',
    language: 'javascript', type: 'RangeError', severity: 'critical',
    test: /Maximum call stack size exceeded/i,
    cause: () => 'A function is calling itself (directly or indirectly) without a condition that stops it — infinite recursion.',
    solution: () => 'Find the recursive call and add a base case, or check for an accidental circular reference between two functions.',
    simple: 'A function keeps calling itself forever and never stops.',
  },
  {
    id: 'js-unexpected-token',
    language: 'javascript', type: 'SyntaxError', severity: 'warning',
    test: /Unexpected token '?([^\s']+)'?/i,
    cause: (m) => `The parser hit an unexpected symbol (\`${m[1]}\`) — usually a missing comma, bracket, or parenthesis just before this point.`,
    solution: () => 'Check the matching brackets/parentheses/quotes right above the reported line.',
    simple: 'There is a small typo or missing symbol breaking the code\'s structure.',
  },
  {
    id: 'js-await-outside',
    language: 'javascript', type: 'SyntaxError', severity: 'warning',
    test: /await is only valid in async function/i,
    cause: () => 'The `await` keyword was used inside a function that was never marked `async`.',
    solution: () => 'Add `async` to the enclosing function definition, e.g. `async function foo() { ... }`.',
    simple: 'You used "await" in a place that isn\'t allowed to wait for things.',
    fix: () => ({ before: `function load() { await fetch(url); }`, after: `async function load() { await fetch(url); }` }),
  },

  /* ---------------------------- TypeScript ---------------------------- */
  {
    id: 'ts-2339',
    language: 'typescript', type: 'TS2339', severity: 'error',
    test: /Property '(\w+)' does not exist on type '([^']+)'/,
    cause: (m) => `TypeScript's type checker doesn't believe the type \`${m[2]}\` has a property called \`${m[1]}\`, so it refuses to compile — even if it would work at runtime.`,
    solution: (m) => `Fix the type definition to include \`${m[1]}\`, cast to the correct type, or check for a typo in the property name.`,
    simple: 'TypeScript thinks that value doesn\'t have the field you\'re trying to use.',
  },
  {
    id: 'ts-2322',
    language: 'typescript', type: 'TS2322', severity: 'error',
    test: /Type '([^']+)' is not assignable to type '([^']+)'/,
    cause: (m) => `A value of type \`${m[1]}\` is being assigned where type \`${m[2]}\` is expected — the shapes don't match.`,
    solution: () => 'Adjust the value to match the expected type, widen/narrow the type definition, or add an explicit cast if you\'re certain it\'s safe.',
    simple: 'You\'re putting the wrong "shape" of data into a slot that expects something else.',
  },
  {
    id: 'ts-2531',
    language: 'typescript', type: 'TS2531', severity: 'warning',
    test: /Object is possibly 'null'/,
    cause: () => 'TypeScript sees a code path where this value could be `null`, and won\'t let you use it without handling that case.',
    solution: () => 'Add a null check, use optional chaining (`?.`), or a non-null assertion (`!`) only if you are certain it can\'t be null.',
    simple: 'TypeScript is warning that this value might be empty before you use it.',
  },

  /* ---------------------------- React ---------------------------- */
  {
    id: 'react-hooks-order',
    language: 'react', type: 'React Hook Error', severity: 'critical',
    test: /Rendered (?:more|fewer) hooks than during the previous render/i,
    cause: () => 'A hook (`useState`, `useEffect`, etc.) is being called conditionally, inside a loop, or after an early `return` — React requires hooks to run in the exact same order on every render.',
    solution: () => 'Move all hook calls to the top level of the component, before any early returns or conditionals.',
    simple: 'A React "hook" was skipped on one render but not another, which React does not allow.',
  },
  {
    id: 'react-key-prop',
    language: 'react', type: 'React Warning', severity: 'warning',
    test: /Each child in a list should have a unique "key" prop/i,
    cause: () => 'A list of elements is being rendered with `.map()` but no stable `key` prop was given, so React can\'t efficiently track which item changed.',
    solution: () => 'Add a unique, stable `key` (like an id from your data) to the outermost element returned inside `.map()`.',
    simple: 'React needs a unique label on each item in a list, and one is missing.',
    fix: () => ({ before: `items.map(item => <li>{item.name}</li>)`, after: `items.map(item => <li key={item.id}>{item.name}</li>)` }),
  },
  {
    id: 'react-setstate-unmounted',
    language: 'react', type: 'React Warning', severity: 'warning',
    test: /Can't perform a React state update on an unmounted component/i,
    cause: () => 'An async task (fetch, timer, subscription) resolved and tried to call `setState` after the component was already removed from the page.',
    solution: () => 'Cancel the async task or ignore its result in a cleanup function returned from `useEffect`.',
    simple: 'The component was closed before its background task finished, and the task tried to update it anyway.',
  },
  {
    id: 'react-invalid-hook-call',
    language: 'react', type: 'React Hook Error', severity: 'critical',
    test: /Invalid hook call\. Hooks can only be called inside/i,
    cause: () => 'A hook was called outside of a React function component or custom hook — often from a regular helper function, or from mismatched React versions.',
    solution: () => 'Only call hooks at the top level of a component or another hook. Check for duplicate React installations in node_modules.',
    simple: 'A React hook was used somewhere React does not allow it to be used.',
  },

  /* ---------------------------- Vue ---------------------------- */
  {
    id: 'vue-prop-type',
    language: 'vue', type: 'Vue Warning', severity: 'warning',
    test: /\[Vue warn\]: Invalid prop: type check failed for prop "(\w+)"/,
    cause: (m) => `The prop \`${m[1]}\` was passed a value whose type doesn't match what the component declared in its \`props\` definition.`,
    solution: (m) => `Pass a value of the correct type for \`${m[1]}\`, or relax the prop's type definition if multiple types are valid.`,
    simple: 'A component was given the wrong kind of value for one of its settings.',
  },
  {
    id: 'vue-undefined-property',
    language: 'vue', type: 'Vue Warning', severity: 'warning',
    test: /\[Vue warn\]: Property "?(\w+)"? was accessed during render but is not defined/,
    cause: (m) => `The template references \`${m[1]}\`, but it was never returned from \`setup()\`/\`data()\`, so Vue can't find it.`,
    solution: (m) => `Add \`${m[1]}\` to your component's reactive state, or check for a typo in the template.`,
    simple: 'The page tried to show a value that the component never defined.',
  },

  /* ---------------------------- HTML / CSS ---------------------------- */
  {
    id: 'html-unclosed-tag',
    language: 'html', type: 'Markup Warning', severity: 'warning',
    test: /unclosed element|tag .* not closed/i,
    cause: () => 'An HTML element was opened but never closed, which can cause following content to render inside it unintentionally.',
    solution: () => 'Locate the opening tag and add its matching closing tag, or use a self-closing form for void elements.',
    simple: 'A piece of HTML was left "open" and never closed.',
  },
  {
    id: 'css-unknown-property',
    language: 'css', type: 'CSS Warning', severity: 'info',
    test: /unknown property '?([a-zA-Z-]+)'?/i,
    cause: (m) => `The browser doesn't recognise the CSS property \`${m[1]}\` — likely a typo, a non-standard property, or missing vendor prefix.`,
    solution: (m) => `Check the spelling of \`${m[1]}\` against the CSS specification, or add the correct vendor prefix if it's experimental.`,
    simple: 'You used a style rule the browser doesn\'t understand.',
  },

  /* ---------------------------- PHP / Laravel ---------------------------- */
  {
    id: 'php-undefined-variable',
    language: 'php', type: 'Warning', severity: 'warning',
    test: /Undefined variable \$?(\w+)/i,
    cause: (m) => `The variable \`$${m[1]}\` is used but was never assigned a value in this scope before this point.`,
    solution: (m) => `Initialise \`$${m[1]}\` before using it, or use \`isset($${m[1]})\` / the null coalescing operator (\`??\`) to guard against it being missing.`,
    simple: 'PHP is using a variable that was never set.',
    fix: (m) => ({ before: `echo $${m[1]};`, after: `echo $${m[1]} ?? '';` }),
  },
  {
    id: 'php-undefined-array-key',
    language: 'php', type: 'Warning', severity: 'warning',
    test: /Undefined array key "?(\w+)"?/i,
    cause: (m) => `The array key \`"${m[1]}"\` doesn't exist in the array being accessed.`,
    solution: (m) => `Check the key exists first with \`isset($array['${m[1]}'])\`, or use \`$array['${m[1]}'] ?? $default\`.`,
    simple: 'The code looked for an item in a list by a name that isn\'t there.',
  },
  {
    id: 'php-call-to-undefined-method',
    language: 'php', type: 'Error', severity: 'critical',
    test: /Call to undefined method ([\w\\]+)::(\w+)\(\)/,
    cause: (m) => `\`${m[1]}\` has no method named \`${m[2]}()\` — likely a typo, a method that was renamed/removed, or the wrong class was used.`,
    solution: (m) => `Double-check the method name and class, and confirm the correct class is being instantiated or injected.`,
    simple: 'The code tried to run an action that doesn\'t exist on that object.',
  },
  {
    id: 'php-class-not-found',
    language: 'php', type: 'Error', severity: 'critical',
    test: /Class "?([\w\\]+)"? not found/i,
    cause: (m) => `PHP could not locate the class \`${m[1]}\` — usually a missing \`use\` import, wrong namespace, or the file was never autoloaded.`,
    solution: () => 'Verify the namespace and `use` statement, and run `composer dump-autoload` if the class is new.',
    simple: 'PHP is looking for a class/file that it can\'t find.',
  },
  {
    id: 'laravel-model-not-found',
    language: 'laravel', type: 'ModelNotFoundException', severity: 'error',
    test: /No query results for model \[([\w\\]+)\]/,
    cause: (m) => `\`${m[1]}::findOrFail()\` (or an implicit route-model binding) was asked for a record that doesn't exist in the database.`,
    solution: () => 'Confirm the ID being passed is correct, or use `find()` instead of `findOrFail()` and handle the null case yourself.',
    simple: 'Laravel looked for a database record that isn\'t there.',
  },
  {
    id: 'laravel-method-not-allowed',
    language: 'laravel', type: 'MethodNotAllowedHttpException', severity: 'error',
    test: /MethodNotAllowedHttpException/,
    cause: () => 'The HTTP method used for the request (GET/POST/PUT/DELETE) doesn\'t match any route defined for that URL.',
    solution: () => 'Check `routes/web.php` or `routes/api.php` for the correct method, and make sure your form/fetch call uses it (including a `@method(\'PUT\')` directive for spoofed methods in Blade forms).',
    simple: 'You tried to reach a page using the wrong kind of request (like POST instead of GET).',
  },
  {
    id: 'laravel-mass-assignment',
    language: 'laravel', type: 'MassAssignmentException', severity: 'error',
    test: /Add \[(\w+)\] to fillable property/,
    cause: (m) => `You tried to mass-assign the \`${m[1]}\` attribute, but it isn't listed in the model's \`$fillable\` array (Laravel blocks this for security).`,
    solution: (m) => `Add \`'${m[1]}'\` to the model's \`$fillable\` array, or assign it explicitly outside of mass assignment.`,
    simple: 'Laravel blocked saving a field because it wasn\'t marked as safe to fill.',
  },
  {
    id: 'laravel-sqlstate',
    language: 'laravel', type: 'QueryException', severity: 'critical',
    test: /SQLSTATE\[(\w+)\]:?\s*(.*)/,
    cause: (m) => `The database rejected the query — SQLSTATE ${m[1]}${m[2] ? `: ${m[2].slice(0, 120)}` : ''}.`,
    solution: () => 'Check the migration/schema matches what the query expects (column names, types, constraints), and inspect the raw SQL in the exception for the exact failure.',
    simple: 'The database refused the request your app sent it.',
  },

  /* ---------------------------- Node.js ---------------------------- */
  {
    id: 'node-module-not-found',
    language: 'node', type: 'Error', severity: 'critical',
    test: /Cannot find module '([^']+)'/,
    cause: (m) => `Node couldn't resolve the module \`${m[1]}\` — either it isn't installed, the path is wrong, or it's missing from \`package.json\`.`,
    solution: (m) => `Run \`npm install ${m[1].startsWith('.') ? '' : m[1]}\`.trim() if it's a package, or fix the relative import path if it's a local file.`,
    simple: 'Node is looking for a file or package that it can\'t find.',
  },
  {
    id: 'node-eaddrinuse',
    language: 'node', type: 'Error', severity: 'error',
    test: /EADDRINUSE.*?:(\d+)/,
    cause: (m) => `Something is already listening on port ${m[1]}, so this server can't bind to it.`,
    solution: (m) => `Stop the other process using port ${m[1]} (\`lsof -i :${m[1]}\` then kill it), or run this server on a different port.`,
    simple: 'Another program is already using the network port this app wants.',
  },
  {
    id: 'node-unhandled-promise',
    language: 'node', type: 'UnhandledPromiseRejection', severity: 'error',
    test: /UnhandledPromiseRejection|Unhandled promise rejection/i,
    cause: () => 'A Promise was rejected (threw an error) but nothing was listening for that rejection with `.catch()` or a `try/catch` around `await`.',
    solution: () => 'Wrap the async call in `try { await ... } catch (err) { ... }`, or add a `.catch()` handler to the Promise chain.',
    simple: 'Something failed inside an async task, and nothing was there to catch the failure.',
  },
  {
    id: 'node-econnrefused',
    language: 'node', type: 'Error', severity: 'error',
    test: /ECONNREFUSED/,
    cause: () => 'A network connection was refused — the target server/database isn\'t running, is on a different port, or is blocked by a firewall.',
    solution: () => 'Confirm the target service is running and reachable at the host/port you\'re connecting to.',
    simple: 'The app tried to connect to something that isn\'t accepting connections.',
  },

  /* ---------------------------- Python ---------------------------- */
  {
    id: 'py-attribute-error',
    language: 'python', type: 'AttributeError', severity: 'error',
    test: /AttributeError: '(\w+)' object has no attribute '(\w+)'/,
    cause: (m) => `An object of type \`${m[1]}\` doesn't have an attribute called \`${m[2]}\` — often because the object is \`None\`, or the wrong type was returned earlier.`,
    solution: (m) => `Print/inspect the object's type right before this line, and confirm \`${m[2]}\` is spelled correctly and defined on \`${m[1]}\`.`,
    simple: 'The code tried to use a feature that this type of object doesn\'t have.',
  },
  {
    id: 'py-key-error',
    language: 'python', type: 'KeyError', severity: 'error',
    test: /KeyError: '?(\w+)'?/,
    cause: (m) => `The dictionary key \`'${m[1]}'\` doesn't exist in the dict being accessed.`,
    solution: (m) => `Use \`dict.get('${m[1]}', default)\` instead of \`dict['${m[1]}']\`, or check \`'${m[1]}' in dict\` first.`,
    simple: 'The code looked for an item by a name that isn\'t in the dictionary.',
  },
  {
    id: 'py-type-error-none',
    language: 'python', type: 'TypeError', severity: 'error',
    test: /TypeError: 'NoneType' object is not (subscriptable|callable|iterable)/,
    cause: (m) => `A value that is \`None\` was used as if it were ${m[1] === 'callable' ? 'a function' : m[1] === 'iterable' ? 'a list/iterable' : 'a subscriptable object (like a list or dict)'}.`,
    solution: () => 'Trace back to where the value should have been returned, and confirm the function that produced it actually returns something on every path.',
    simple: 'A value that should exist turned out to be empty ("None"), and the code tried to use it anyway.',
  },
  {
    id: 'py-indentation',
    language: 'python', type: 'IndentationError', severity: 'error',
    test: /IndentationError: (.+)/,
    cause: (m) => `Python's indentation rules were broken: ${m[1]}.`,
    solution: () => 'Make sure the block uses consistent spaces (not a mix of tabs and spaces), typically 4 spaces per indent level.',
    simple: 'The spacing at the start of a line doesn\'t match what Python expects.',
  },
  {
    id: 'py-module-not-found',
    language: 'python', type: 'ModuleNotFoundError', severity: 'critical',
    test: /ModuleNotFoundError: No module named '?(\w+)'?/,
    cause: (m) => `Python can't find the package \`${m[1]}\` — it isn't installed in the current environment.`,
    solution: (m) => `Install it with \`pip install ${m[1]}\`, and confirm you're in the right virtual environment.`,
    simple: 'Python is looking for a package that isn\'t installed.',
  },
  {
    id: 'py-zero-division',
    language: 'python', type: 'ZeroDivisionError', severity: 'error',
    test: /ZeroDivisionError/,
    cause: () => 'The code attempted to divide a number by zero, which is mathematically undefined.',
    solution: () => 'Check the divisor before dividing, and handle the zero case explicitly.',
    simple: 'The code tried to divide something by zero.',
  },

  /* ---------------------------- Java ---------------------------- */
  {
    id: 'java-npe',
    language: 'java', type: 'NullPointerException', severity: 'critical',
    test: /NullPointerException/,
    cause: () => 'Code called a method or accessed a field on a reference that is `null`.',
    solution: () => 'Add a null check before the call, or use `Optional` to make the possibility of absence explicit.',
    simple: 'The code tried to use an object that was never actually created.',
  },
  {
    id: 'java-class-not-found',
    language: 'java', type: 'ClassNotFoundException', severity: 'critical',
    test: /ClassNotFoundException: ([\w.$]+)/,
    cause: (m) => `The JVM tried to load \`${m[1]}\` at runtime but couldn't find it on the classpath.`,
    solution: () => 'Confirm the dependency/jar containing this class is on the classpath, and rebuild the project.',
    simple: 'Java is looking for a class file it can\'t find.',
  },
  {
    id: 'java-array-index',
    language: 'java', type: 'ArrayIndexOutOfBoundsException', severity: 'error',
    test: /ArrayIndexOutOfBoundsException:? (?:Index )?(-?\d+)/,
    cause: (m) => `Index \`${m[1]}\` was used, but it's outside the valid range of the array.`,
    solution: () => 'Check the array\'s length before indexing into it, and confirm the loop bounds are correct.',
    simple: 'The code tried to reach an item in a list that doesn\'t exist at that position.',
  },
  {
    id: 'java-number-format',
    language: 'java', type: 'NumberFormatException', severity: 'error',
    test: /NumberFormatException: For input string: "([^"]*)"/,
    cause: (m) => `The string \`"${m[1]}"\` could not be parsed into a number.`,
    solution: () => 'Validate the input is numeric before parsing, or trim/sanitize it first.',
    simple: 'The code tried to turn text into a number, but the text wasn\'t a valid number.',
  },

  /* ---------------------------- C# ---------------------------- */
  {
    id: 'csharp-nullref',
    language: 'csharp', type: 'NullReferenceException', severity: 'critical',
    test: /NullReferenceException/,
    cause: () => 'Code accessed a member on an object reference that is currently `null`.',
    solution: () => 'Add a null check, or use the null-conditional operator (`obj?.Member`).',
    simple: 'The code tried to use an object that doesn\'t exist yet.',
  },
  {
    id: 'csharp-index-out-of-range',
    language: 'csharp', type: 'IndexOutOfRangeException', severity: 'error',
    test: /IndexOutOfRangeException/,
    cause: () => 'An array or list was accessed using an index outside its valid bounds.',
    solution: () => 'Check `.Length`/`.Count` before indexing, and verify loop conditions.',
    simple: 'The code tried to reach an item in a list at a position that doesn\'t exist.',
  },
  {
    id: 'csharp-invalid-cast',
    language: 'csharp', type: 'InvalidCastException', severity: 'error',
    test: /InvalidCastException/,
    cause: () => 'A value was cast to a type it can\'t actually be converted to.',
    solution: () => 'Use `as` with a null check, or `is` to test the type before casting.',
    simple: 'The code tried to treat something as a different type than it really is.',
  },

  /* ---------------------------- SQL ---------------------------- */
  {
    id: 'sql-syntax-error',
    language: 'sql', type: 'Syntax Error', severity: 'error',
    test: /You have an error in your SQL syntax.*near '([^']*)'/is,
    cause: (m) => `MySQL flagged invalid syntax near \`${m[1]}\`.`,
    solution: () => 'Check for a missing comma, mismatched quotes, or a reserved keyword used as an identifier near that point.',
    simple: 'There is a small mistake in how the SQL query is written.',
  },
  {
    id: 'sql-unknown-column',
    language: 'sql', type: 'Error', severity: 'error',
    test: /Unknown column '([^']+)' in/,
    cause: (m) => `The query references a column \`${m[1]}\` that doesn't exist in the table (or in the current \`JOIN\` context).`,
    solution: (m) => `Check the table schema for the correct column name, and verify the table alias used for \`${m[1]}\`.`,
    simple: 'The query asked for a column that doesn\'t exist in that table.',
  },
  {
    id: 'sql-duplicate-entry',
    language: 'sql', type: 'IntegrityConstraintViolation', severity: 'error',
    test: /Duplicate entry '([^']+)' for key '([^']+)'/,
    cause: (m) => `Inserting \`'${m[1]}'\` violated the unique constraint \`${m[2]}\` — a row with that value already exists.`,
    solution: () => 'Check for the existing row first, use `INSERT ... ON DUPLICATE KEY UPDATE`, or generate a unique value.',
    simple: 'You tried to add a record that would duplicate something that has to stay unique.',
  },
  {
    id: 'sql-table-doesnt-exist',
    language: 'sql', type: 'Error', severity: 'critical',
    test: /Table '([^']+)' doesn't exist/,
    cause: (m) => `The table \`${m[1]}\` doesn't exist in this database — likely a migration hasn't run, or the wrong database is connected.`,
    solution: () => 'Run pending migrations and confirm the connection is pointed at the correct database/schema.',
    simple: 'The query is looking for a table that hasn\'t been created.',
  },

  /* ---------------------------- JSON ---------------------------- */
  {
    id: 'json-unexpected-end',
    language: 'json', type: 'SyntaxError', severity: 'warning',
    test: /Unexpected end of JSON input/i,
    cause: () => 'The JSON text was cut off before it was complete — often an empty response body or a truncated network response.',
    solution: () => 'Log the raw response text before parsing, and check the server actually sent a full JSON body.',
    simple: 'The JSON text stops in the middle, before it was finished.',
  },

  /* ---------------------------- Git / GitHub ---------------------------- */
  {
    id: 'git-merge-conflict',
    language: 'git', type: 'Merge Conflict', severity: 'warning',
    test: /CONFLICT \(content\): Merge conflict in (.+)/,
    cause: (m) => `Both branches changed overlapping lines in \`${m[1]}\`, so Git can't merge them automatically.`,
    solution: (m) => `Open \`${m[1]}\`, resolve the \`<<<<<<<\` / \`=======\` / \`>>>>>>>\` markers manually, then \`git add\` and continue the merge.`,
    simple: 'Two sets of changes overlap in the same file, and Git needs you to pick which parts to keep.',
  },
  {
    id: 'git-non-fast-forward',
    language: 'git', type: 'Push Rejected', severity: 'warning',
    test: /! \[rejected\].*non-fast-forward|Updates were rejected because the tip of your current branch is behind/i,
    cause: () => 'The remote branch has commits that your local branch doesn\'t have, so Git refuses to overwrite them.',
    solution: () => 'Run `git pull --rebase` (or `git pull`) to bring in the remote commits, resolve any conflicts, then push again.',
    simple: 'Someone else pushed changes you don\'t have locally yet.',
  },
  {
    id: 'git-detached-head',
    language: 'git', type: 'Detached HEAD', severity: 'info',
    test: /detached HEAD/i,
    cause: () => 'You\'ve checked out a specific commit rather than a branch, so new commits won\'t belong to any branch by default.',
    solution: () => 'Create a branch at this point with `git checkout -b <new-branch-name>` before committing further work.',
    simple: 'You\'re looking at a specific point in history rather than the tip of a branch.',
  },
  {
    id: 'git-permission-denied',
    language: 'git', type: 'Authentication Error', severity: 'error',
    test: /Permission denied \(publickey\)/i,
    cause: () => 'GitHub rejected the SSH connection because no matching SSH key was found for your account.',
    solution: () => 'Generate an SSH key with `ssh-keygen`, add the public key to your GitHub account settings, and confirm `ssh -T git@github.com` succeeds.',
    simple: 'GitHub doesn\'t recognize the key your computer is using to identify you.',
  },
];
