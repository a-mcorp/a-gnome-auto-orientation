## As an Operator, I want to understand the code's logic and know it holds no surprises
- Review the code module by module, to the best of my ability (TypeScript is not my main language): it does what the comments say, and nothing inside is unexpected.
- Remove the "Auto-generated:" prefix from each comment once it has been reviewed.

## As an Operator, I want the extension listed on extensions.gnome.org
- Check the extension against the [review guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html) before uploading.
- Upload the packed zip, answer the reviewers' feedback and release the fixes as new versions until it is accepted.

## As an Operator, I want a maintenance plan that keeps the extension working
- Decide how to follow new GNOME Shell and Fedora releases: test each one, then add it to `shell-version` in `metadata.json`.
- Decide how often to update the development tools and their pinned versions (Deno, lefthook, TypeScript, the `@girs` type definitions).
- Watch for changes in the interfaces the extension depends on (`org.gnome.Mutter.DisplayConfig`, `iio-sensor-proxy`).

## As an Operator, I want CI pipelines that check every change
- Run the `check` bundle through Deno (`deno fmt`, `deno lint`, `deno check`, `tsc`) and a build on Fedora, for every Pull Request.

## As an Operator, I want CD pipelines with a QA review for every release
- Pack the extension on Fedora for each release, review it before it is released, then upload it.
