import { defineBoot } from "#q-app/wrappers";

export default defineBoot(({ app }) => {
	// Catch Vue component errors
	app.config.errorHandler = (err, _instance, info) => {
		console.error("Vue error:", err, info);
		// Surface non-fatal errors to help diagnose black screen cases
		// Keep it unobtrusive; do not spam
		// Notify.create({ type: "negative", message: `Error: ${String(err)}` });
	};

	// Catch uncaught errors
	window.addEventListener("error", (event) => {
		console.error("Window error:", event.error || event.message || event);
	});

	// Catch unhandled promise rejections to avoid aborting app mount
	window.addEventListener("unhandledrejection", (event) => {
		console.error("Unhandled rejection:", event.reason);
		// Prevent default to avoid global error surfacing that might halt rendering
		try {
			event.preventDefault();
		} catch {
			/* ignore */
		}
		// Optionally inform the user
		// Notify.create({ type: "warning", message: "A background task failed. See console for details." });
	});
});
