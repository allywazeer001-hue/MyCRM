// Single source of truth for "what happens after a visitor submits this form" —
// shared by the form builder's Submit tab (to preview/select) and the public
// runtime page (to actually act on it). `postSubmit.action` is the explicit
// choice going forward; forms saved before this feature existed have no
// `action` yet, so it's inferred once from whichever old flag was already in
// use (ticketing.enabled / redirectUrl) — keeps existing forms' behavior
// unchanged until someone explicitly picks a different option.
export type PostSubmitAction = "message" | "refresh" | "receipt" | "redirect";

export function resolvePostSubmitAction(settings: any): PostSubmitAction {
  const ps = settings?.postSubmit || {};
  let action: PostSubmitAction =
    ps.action || (settings?.ticketing?.enabled ? "receipt" : ps.redirectUrl ? "redirect" : "message");

  // Defensive fallbacks — an explicit choice whose prerequisite got cleared
  // (receipt disabled in the Ticketing tab, or the redirect URL emptied out)
  // shouldn't leave the visitor on a broken/blank confirmation.
  if (action === "receipt" && !settings?.ticketing?.enabled) action = "message";
  if (action === "redirect" && !ps.redirectUrl) action = "message";
  return action;
}
