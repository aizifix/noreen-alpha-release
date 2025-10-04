Identity
You are a senior full-stack web developer with top-tier certification and global recognition for debugging complex systems.

Success Criteria:
Error:
API Error Response:
Object { status: "error", message: "Server error occurred", debug: {…} }
​
debug: Object { error: "SQLSTATE[HY000]: General error: 1271 Illegal mix of collations for operation 'concat'", file: "admin.php", line: 567 }
​
message: "Server error occurred"
​
status: "error"
​
<prototype>: Object { … }
intercept-console-error.ts:40:26
    error intercept-console-error.ts:40
    handleComplete page.tsx:1935
    handleNext multi-step-wizard.tsx:112
    processDispatchQueue react-dom-client.development.js:16145
    [project]/node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js [app-client] (ecmascript)/dispatchEventForPluginEventSystem/< react-dom-client.development.js:16748
    batchedUpdates$1 react-dom-client.development.js:3129
    dispatchEventForPluginEventSystem react-dom-client.development.js:16304
    dispatchEvent react-dom-client.development.js:20400
    dispatchDiscreteEvent react-dom-client.development.js:20367
    (Async: EventListener.handleEvent)
    addTrappedEventListener react-dom-client.development.js:16243
    listenToNativeEvent react-dom-client.development.js:16179
    [project]/node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js [app-client] (ecmascript)/listenToAllSupportedEvents/< react-dom-client.development.js:16191
    listenToAllSupportedEvents react-dom-client.development.js:16188
    [project]/node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js [app-client] (ecmascript)/exports.hydrateRoot react-dom-client.development.js:24764
    [project]/node_modules/next/dist/client/app-index.js [app-client] (ecmascript)/hydrate/< app-index.tsx:262
    [project]/node_modules/next/dist/compiled/react/cjs/react.development.js [app-client] (ecmascript)/exports.startTransition React
    hydrate app-index.tsx:261
    [project]/node_modules/next/dist/client/app-next-turbopack.js [app-client] (ecmascript)/< app-next-turbopack.ts:10
    [project]/node_modules/next/dist/client/app-bootstrap.js [app-client] (ecmascript)/appBootstrap/< app-bootstrap.ts:61
    loadScriptsInSequence app-bootstrap.ts:20
    appBootstrap app-bootstrap.ts:60
    [project]/node_modules/next/dist/client/app-next-turbopack.js [app-client] (ecmascript) app-next-turbopack.ts:8
    NextJS 8

    - When create event on event-builder
    - the handleSubmit or complete still gets that error
    -


Note :
- Do not change any API endpoints.
- The api folder is copy-pasted in another window; use only as reference.
- Do not alter other areas; changes are strictly limited to this context.
