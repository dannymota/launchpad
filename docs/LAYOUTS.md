# Page layouts

This is the catalogue of layouts for pages, emails and notices: structures known to work, so that
a new page starts from one of them and not from a blank file. Find the layout that matches the
page, build its regions in the order given and keep its rules. Start from the Astryx template or
blocks named (`npx astryx template <id>` prints one; run it from `apps/web`), and use the
Impeccable command named to plan or check it. Within a group, the entries are in order of
priority: the first is the one a product needs soonest. A figure in a rule names its source.

## The signed-in product

Pages where someone is doing a task. Impeccable calls these Operate surfaces: the structure is the
one people already know, and the brand lives in the details.

### App shell

The frame every signed-in page shares: it says where a person is and takes them elsewhere.

**Regions**

1. A skip link to the content.
2. Side navigation: the product's mark, grouped destinations, settings and account at the foot.
3. A top bar, if needed: breadcrumb, search, account menu.
4. The page header: title and one primary action.
5. The content: capped in width for prose and forms, full width for tables and charts.

**Rules**

- Side navigation is the default, because it takes new destinations without a redesign. Use a top
  bar alone only for a short list that will stay short: design systems put that line between
  three and six sections. Use both only when the top bar has a job of its own, such as search.
- Phone: the navigation leaves the page and opens from a menu button as an overlay. Atlassian
  collapses it under 1024px; Astryx swaps to `MobileNav` at 768px. One list of destinations feeds
  both forms, and choosing a destination closes the overlay.
- The current page is marked from the route, and never by colour alone.
- States: the shell draws at once and stays put while the content region loads, is empty or fails.

**Start from**: `shell-side-nav` (the default), `shell-top-nav`, `shell-nav` (both bars); blocks
`AppShellSideNavOnly`, `AppShellTopNavWithSideNav`, `MobileNavBasicMobileNav`,
`SideNavNestedItems`. `npx astryx docs layout/scaffold` gives the reasoning for each choice.

**Plan and check with**: `/impeccable shape` before building, `/impeccable adapt` for the phone
width, `/impeccable audit` for keyboard and landmarks.

**Sources**:
[Atlassian, layout](https://atlassian.design/components/navigation-system/layout/examples),
[Microsoft, layout](https://learn.microsoft.com/en-us/power-platform/well-architected/experience-optimization/layout),
and for the number of sections
[Jumbo, side navigation](https://design.jumbo.com/latest/core-components/navigation/side-navigation/guidelines-sSUnx3uW)
and [Merid, navigation layouts](https://meridui.dev/docs/patterns/app-shell).

### Loading, empty and error states

What a content region shows when it has nothing yet, nothing at all, or a failure.

**Regions**, one per state

1. Loading: a skeleton in the shape of the content to come.
2. Empty, first use: a title that names the thing, one sentence on what it is for, and one action
   that makes the first one.
3. No results: the search or filter that matched nothing, and a way to clear it.
4. Error: what failed in plain words, whether anything was saved, a retry, a reference for support.
5. No access: what is locked, and who can grant it.

**Rules**

- The state replaces the content region only. Navigation and the page header stay.
- A failed load never looks like an empty list: people conclude that their data is gone.
- An empty region is never left blank. Say what will appear there and how to add it (NN/g).
- Use a skeleton on first load and a spinner over the existing rows on refresh, so nothing jumps.
- Phone: the same five states. An illustration is the first thing to go, the action the last.

**Start from**: blocks `EmptyStateActions`, `EmptyStateCompact`, `EmptyStateContainer`,
`SkeletonTableRowSkeleton`, `SkeletonStaggeredList`, `SkeletonCardSkeleton`,
`BannerWithActionButton` for an error, `SpinnerWithLabel`. Nothing ready-made for a whole error
page.

**Plan and check with**: `/impeccable harden` (it walks empty, loading, error and long text),
`/impeccable onboard` for the first-use state, `/impeccable clarify` for the wording of errors.

**Sources**:
[NN/g, empty states](https://www.nngroup.com/articles/empty-state-interface-design/),
[Primer, empty states](https://primer.style/product/ui-patterns/empty-states/).

### Table page with filters

A page for finding one record among many, and for acting on several at once.

**Regions**

1. Page header: title, count, and the button that makes a new record.
2. Toolbar: search, filters, saved views, column settings.
3. The filters in force, as removable chips, with Clear all.
4. The table: a readable name in the first column, sortable headers, a row menu in the last.
5. A bar of bulk actions, shown while rows are selected.
6. Pagination.

**Rules**

- The first column is a name a person recognises, not a generated id, and the columns run in
  order of importance (NN/g).
- Filters in force stay visible when the filter controls are closed, with a count and a way to
  clear them (Carbon).
- Use pagination or load-more, never both (Cloudscape).
- The table fills its region. Do not put it in a card or cap its width.
- Phone: each row stacks to its name and one or two fields, and the filters open in a sheet.
- States: skeleton rows on first load. Zero results says which filter matched nothing and offers
  Clear filters. A failed load is an error with a retry, never an empty table.

**Start from**: `table-page` (search and column filters), `table-filter` (saved views and a detail
pane), `table` (bulk actions and row menus), `table-grouped`; blocks `TableBulkActionsTable`,
`ToolbarTableFilter`, `PopoverFilterPanel`, `PaginationWithTable`, `SkeletonTableRowSkeleton`.

**Plan and check with**: `/impeccable harden`, and `/impeccable layout` if the toolbar crowds.

**Sources**:
[Cloudscape, table view](https://cloudscape.design/patterns/resource-management/view/table-view),
[Carbon, filtering](https://carbondesignsystem.com/patterns/filtering),
[NN/g, data tables](https://www.nngroup.com/articles/data-tables/).

### Record page

One record, with what belongs to it and what has happened to it.

**Regions**

1. A breadcrumb back to the list.
2. Header: title, status, one primary action, the rest in a menu.
3. Main column, two thirds: what defines the record, then the rows that belong to it.
4. Side column, one third: status, facts about the record, a summary.
5. Activity: what happened, newest first.

**Rules**

- Order each column by importance, and keep the page at its default width, not full width
  (Polaris).
- Group related facts in one section. Do not give each fact a card of its own.
- The destructive action sits last in the menu and asks for confirmation that names the record.
- Phone: one column, the main column first and the side column after it.
- States: a record that no longer exists shows a not-found state inside the shell. It names what
  was looked for and links to the list.

**Start from**: `detail-page`, `work-item-detail`; blocks `LayoutHeaderWithActions`,
`MetadataListMultiColumnMetadata`, `BreadcrumbsShowcase`.

**Plan and check with**: `/impeccable shape`, then `/impeccable harden` for long names and many
rows.

**Sources**:
[Polaris, resource details layout](https://polaris-react.shopify.com/patterns/resource-details-layout).

### Create or edit form

A form that makes a record or changes one.

**Regions**

1. A title that names the action and the thing: "New project", "Edit project".
2. The fields in one column, under section headings once there are more than five.
3. Errors: beside each field, and summarised at the top after a failed submit.
4. A footer that stays in view: Cancel, then a button that names the action.
5. A warning before leaving with unsaved changes.

**Rules**

- Where it opens depends on its size: a dialog for up to about four fields in one step (MongoDB),
  a page for anything larger (Shopify), a wizard only when the steps truly follow one another.
- A dialog that holds a form does not close on a click outside it, so a stray click cannot discard
  the work.
- The submit button says what it does ("Create project"), never "Submit" (web.dev).
- Phone: a dialog becomes a full screen, and the footer stays above the keyboard.
- States: while saving, the button shows it and cannot be pressed twice. A failed save keeps
  everything typed and says what to fix.

**Start from**: `contact-form`, `form-two-column`, `form-wizard`, `form-wizard-vertical`,
`form-wizard-inline`, `form-wizard-dialog`; blocks `DialogFormDialog`, `DrawerForm`,
`DialogFullscreenDialog`, `FormLayoutShowcase`, `LayoutFooterActions`.

**Plan and check with**: `/impeccable clarify` for labels and error messages, `/impeccable harden`
for validation and long input.

**Sources**:
[Shopify, forms](https://shopify.dev/docs/apps/design/user-experience/forms),
[MongoDB, forms](https://www.mongodb.design/pattern/forms),
[web.dev, sign-in forms](https://web.dev/articles/sign-in-form-best-practices).

### Settings

Where a person changes how the product behaves for them, and where they leave it.

**Regions**

1. A list of sections: beside the content on a wide screen.
2. Sections, each with a heading and one sentence on what it controls.
3. Rows: label, description, and the control at the end of the row.
4. Save, in each section that has text fields.
5. The destructive section, last and set apart.

**Rules**

- Decide for each section how a change takes effect, and make it visible before anyone touches
  it: a switch applies at once, text waits for Save. Never both in one section. Sources differ on
  the default: Shopify asks for an explicit save, MongoDB for saving at once where it is safe.
- Group by what a setting affects, not by the kind of control.
- With fifteen or more settings, move related ones to a page of their own (Material).
- Deleting an account is the last thing on the page and asks for confirmation.
- Phone: the list of sections is the first page and each section opens from it. A label sits above
  its control when the row is too narrow for both.
- States: a change that applies at once confirms in place, and says so there if it failed.

**Start from**: `settings` (one scrolling page), `settings-sidebar` (sections switched from a
list), `settings-dialog`; blocks `SwitchSettingsPanel`, `AlertDialogDeleteConfirmation`.

**Plan and check with**: `/impeccable clarify` for labels and descriptions, `/impeccable polish`.

**Sources**:
[Polaris, settings layout](https://polaris-react.shopify.com/patterns/app-settings-layout),
[Material, settings](https://m1.material.io/patterns/settings.html),
[Shopify, forms](https://shopify.dev/docs/apps/design/user-experience/forms),
[MongoDB, forms](https://www.mongodb.design/pattern/forms).

### First run

What a new account sees: the shortest way to its first real result.

**Regions**

1. One line on what the person is about to do.
2. The least setup that works: a name, perhaps one choice.
3. The first real action, with a sample or a template to start from.
4. A checklist of three to five tasks, which can be dismissed.
5. Tips later, beside the thing they explain.

**Rules**

- Have people do the task, not watch a tour. In NN/g's study, people who read a tutorial finished
  the task no more often than people who skipped it (91% against 94%) and rated it harder.
- Keep any tour short: Intercom's median five-step tour is finished by 34% of the people who
  start it, and fewer than half reach its second step.
- Always skippable, and never shown again once finished or dismissed.
- Phone: one step to a screen, and the checklist is a single row that shows progress.
- States: first run is itself a state. Show it when the account has no data, in place of empty
  tables and charts.

**Start from**: `form-wizard-dialog` for a short setup; blocks `EmptyStateActions`,
`StepperShowcase`, `CheckboxListShowcase`, `ProgressBarWithValueLabel`. Nothing ready-made for
the checklist.

**Plan and check with**: `/impeccable onboard`.

**Sources**:
[NN/g, tutorials study](https://www.nngroup.com/articles/mobile-tutorials/),
[NN/g, tutorials and contextual help](https://www.nngroup.com/articles/onboarding-tutorials),
[Intercom, tour completion](https://www.intercom.com/help/en/articles/3027087-see-how-your-product-tours-are-performing).

### Overview page

The page that answers "is everything fine, and what needs me?" at a glance.

**Regions**

1. Header, with one control for the period.
2. Three to five headline numbers, each beside the previous period or a target.
3. A short list of what needs attention.
4. Trends.
5. A table that links to the records behind the numbers.

**Rules**

- It is for glancing, not exploring: information to take in fast, with little interaction
  (NN/g).
- No number stands alone. Each has a comparison that says whether it is good.
- Every item leads somewhere: a number or a row opens the records behind it.
- Phone: the headline numbers reflow to one column (`Grid columns={{ minWidth, max }}`), then the
  attention list, then the charts.
- States: a new account sees first run, not empty charts. Each part loads on its own, and one
  that fails says so without blanking the page.

**Start from**: `dashboard`, `dashboard-scorecard`, `dashboard-comparison`, `dashboard-progress`,
`dashboard-alert-rail`; block `GridDashboardLayout`.

**Plan and check with**: `/impeccable shape`, and `/impeccable distill` when it grows crowded.

**Sources**: [NN/g, dashboards](https://www.nngroup.com/articles/dashboards-preattentive).

### List and detail

A list and the selected item side by side, for reading many items without leaving the list.

**Regions**

1. The list pane: search, rows, the selected row marked.
2. A divider, which can be dragged.
3. The detail pane: header, actions, body.
4. A placeholder in the detail pane while nothing is selected.

**Rules**

- One pane under 600 wide, two from 840 (Material's window classes).
- The selected row is marked only when both panes show. A Back control appears only when one does.
- Phone: the list is one screen and the detail the next. Returning keeps the list's place.
- States: the list and the detail load and fail separately. An error in the detail leaves the
  list usable.

**Start from**: `table-inbox`, `table-filter`, `file-explorer`; blocks `LayoutDualPanelLayout`,
`ResizableSidebar`. `npx astryx docs layout/side-panels` covers the pane.

**Plan and check with**: `/impeccable adapt`.

**Sources**:
[Material 3, list-detail](https://m3.material.io/foundations/layout/canonical-layouts/list-detail).

### Command palette and search

One box that finds a place, a record or an action from the keyboard.

**Regions**

1. A visible search field in the shell, showing the shortcut.
2. The input.
3. Recent items, while the query is empty.
4. Results in groups: places, actions, records.
5. Key hints.
6. A row for no results.

**Rules**

- The same shortcut everywhere, Cmd+K or Ctrl+K. Pressing it again closes the palette and returns
  focus to where it was (Superhuman).
- It is never the only way to reach something. It is a faster road to what the pages already
  offer.
- Show what fits where the person is first, and let them widen the search (Retool).
- Leave it out while every command fits in the navigation.
- Phone: there is no shortcut. The search field opens the same list as a full screen.
- States: recent items for an empty query, a loading row while searching, and a no-results row
  that offers the nearest action.

**Start from**: `shell-nav` (its top bar has the search); blocks `CommandPaletteAutoGrouped`,
`CommandPaletteAsyncSearch`, `CommandPaletteEmptyShowcase`, `KbdMenuShortcuts`.

**Plan and check with**: none specific. `/impeccable audit` checks focus and keyboard use.

**Sources**:
[Superhuman, command palette](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/),
[Retool, command palette](https://retool.com/blog/designing-the-command-palette).

## The website

Pages a stranger reads. Impeccable calls the landing and pricing pages Persuade surfaces, where the
design is what the visitor judges, and the legal pages and changelog Read surfaces, where a calm
reading column comes first.

### Landing page

The page that says what the product is and gets the right visitor to try it.

**Regions**

1. Navigation: mark, a few links, one action.
2. Hero: what it is and who it is for, one action, a real view of the product.
3. Proof, only if it is real: named customers, a number that can be sourced.
4. The problem, in the visitor's words.
5. How it works, in three steps.
6. Plans, or a starting price.
7. Questions: the objections a visitor still has.
8. The action again.
9. Footer: legal pages, contact.

**Rules**

- The offer and the action sit in the first screen. In NN/g's eye-tracking, 57% of viewing time
  went above the fold and 74% to the first two screens.
- One primary action, repeated at the end. Anything else is visibly secondary.
- No invented proof. With no real customers or numbers, leave region 3 out.
- The order of regions 4 to 7 is convention, not tested evidence. Change it when the product
  needs it.
- Phone: one column. The links fold behind a menu button and the action stays in view. The view of
  the product must still be readable, not a shrunken blur.
- States: the page reads before any script runs and with images blocked. Headline, action and
  price are text.

**Start from**: `centered-hero`, `gallery-hero`, `side-gallery` for the hero; blocks
`TopNavWithLogo`, `ListOrderedSteps`, `ListBulletedFeatures`, `BlockquoteTestimonials`,
`CollapsibleDividedAccordion` for the questions, `SectionVariants`. Nothing ready-made for the
footer or the closing section.

**Plan and check with**: `/impeccable shape`, `/impeccable critique`, `/impeccable clarify`.

**Sources**:
[NN/g, scrolling and attention](https://www.nngroup.com/articles/scrolling-and-attention/),
[a homepage checklist that cites NN/g](https://www.cortality.com/blog/saas-homepage-best-practices).

### Pricing page, with questions

The page where a visitor finds their plan and what it costs.

**Regions**

1. Heading.
2. A switch between monthly and yearly, showing what yearly saves.
3. Two to four plans as cards: name, who it is for, price, what it adds, action.
4. A comparison table, grouped and closed until asked for.
5. Five to eight questions, each answered in two or three sentences.
6. A way to talk to someone.

**Rules**

- Publish a price: 82% of 4,916 pricing pages in Kenso's crawl do.
- Three plans is the most common count in that crawl (40%), and four among the 127 well-known
  products Screenrove counted (54%). Add a plan only for a kind of buyer the others do not fit.
- Each card says who the plan is for, then only what it adds to the plan before it.
- The switch shows which period is selected and what the other costs. The median yearly saving in
  Kenso's crawl is 20%.
- Mark one plan as recommended only if that is true.
- Cards are for choosing and the table for checking. Keep the table to a few columns with the
  same rows for every plan (NN/g).
- Phone: the cards stack, and the table scrolls sideways under a label column that stays put.
- States: the prices on the page come from the same place the checkout reads them, so the two
  cannot disagree. A plan that cannot be bought yet says so on its button.

**Start from**: `table-comparison` for the table; blocks `RadioListPricingTier`,
`SelectableCardShowcase`, `SegmentedControlShowcase`, `CollapsibleDividedAccordion`. Nothing
ready-made for the page as a whole.

**Plan and check with**: `/impeccable shape`, `/impeccable critique`, `/impeccable clarify`.

**Sources**:
[Kenso, 4,916 pricing pages](https://ken.so/research/saas-pricing-page-psychology.pdf),
[Screenrove, 127 pricing pages](https://screenrove.com/blog/saas-pricing-page-examples),
[NN/g, comparison tables](https://www.nngroup.com/articles/comparison-tables/).

### Not found, maintenance, metadata and share image

The pages and tags nobody designs until they are missing.

**Regions**

1. Not found: what happened in plain words, a link home and one to the nearest useful place, the
   usual navigation.
2. Maintenance: what is happening, when to come back, a way to reach someone that does not depend
   on the product.
3. Metadata, on every page: a title, a description, and `og:title`, `og:type`, `og:image` and
   `og:url`.

**Rules**

- A not-found page answers 404. Never a page that says "not found" with status 200 (Google).
- Maintenance answers 503 with a `Retry-After` header and `Cache-Control: no-store`. It is for
  hours: Google warns that addresses answering 503 for days can drop out of search.
- The share image is 1200 by 630, and the page declares its width and height.
- Inside the signed-in product, not found keeps the shell and links back to the list.
- Phone: one short column. These pages are states themselves, so they need none of their own.

**Start from**: nothing ready-made. An `EmptyState` in a `Layout` with `contentWidth` is enough.

**Plan and check with**: `/impeccable clarify` for the wording.
`/impeccable foundations not-found-page` and `/impeccable foundations social-previews` check that
they exist; `foundations` runs only when the owner asks for it.

**Sources**:
[Google, planned downtime](https://developers.google.com/search/blog/2011/01/how-to-deal-with-planned-site-downtime),
[MDN, Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After),
[The Open Graph protocol](https://ogp.me/),
[share image sizes, quoting Meta](https://figment.so/blog/open-graph-image).

### Legal and about pages

The privacy page, the terms page and the page about who is behind the product: pages for reading.

**Regions**

1. Title, and the date it last changed.
2. A plain summary: who runs the product, what is collected, why, and how to delete it.
3. Contents.
4. Sections under headings.
5. How to get in touch.

**Rules**

- Summary first and detail below: the layered notice the ICO recommends.
- Plain words, short paragraphs, no paragraphs in capitals, and links within the page. People do
  read these pages when they have a question (NN/g).
- Name the other companies that receive data and what each receives. Vague wording reads as
  hiding something (NN/g).
- Every page of the website links to them from its footer.
- Text written by an agent is a draft until a person fit to judge it has read it, and the page
  says so until then.
- Phone: body text as large as on the rest of the website, in a column that uses the width.
- States: none beyond the draft marker.

**Start from**: nothing ready-made. A `Layout` with `contentWidth` (640 suits text); blocks
`LayoutContentWidth`, `OutlineShowcase`, `MarkdownRichContent`.

**Plan and check with**: `/impeccable shape`, `/impeccable clarify`.
`/impeccable foundations legal-pages` checks that they exist and are linked; `foundations` runs
only when the owner asks.

**Sources**:
[NN/g, policy pages](https://www.nngroup.com/articles/privacy-policies-terms-use-pages),
[ICO, layered notices](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-methods-can-we-use-to-provide-privacy-information/).

### Changelog

What changed, for the people who use the product. One format serves the page, a release note and
the link behind an in-app announcement.

**Regions**

1. Title, and a way to follow it: a feed or email.
2. Entries, newest first. Each entry has, in order: the date as YYYY-MM-DD, a title in the
   reader's words, two sentences on what changed for them, the changes grouped as Changed, Added,
   Removed and Fixed, and a link to more.

**Rules**

- Written for people: say the effect of a change, not the commit that made it (Common Changelog).
- Most important first, and leave out what a reader does not care about.
- A release note for a store is the same entry cut to the store's limit.
- Phone: a reading column, with images that scale to it.
- States: with no entries yet, leave the page out until there is one.

**Start from**: nothing ready-made. `Markdown`, `Timestamp` and `List` in a `Layout` with
`contentWidth`.

**Plan and check with**: `/impeccable shape`, `/impeccable clarify`.

**Sources**: [Common Changelog](https://common-changelog.org/).

### Waitlist

A page that takes an address from someone who wants in before the product is open.

**Regions**

1. One line: what the product is and who it is for.
2. One field for an email address, and a button.
3. What happens next, and roughly when.
4. The confirmed state, in the same place.
5. A link to the privacy page.

**Rules**

- One field. Ask for anything else after the person is in.
- Confirm on the page and by email, and say that a mail is coming: on the median list in
  LaunchList's data, 46% of sign-ups confirmed their address when asked to.
- Evidence for this page is thin. That figure is one vendor's, and no study of its layout was
  found.
- Phone: the field and the button stack at full width, and the field asks for the email keyboard.
- States: sending, joined, and an address that is not valid. Someone already on the list sees the
  same message as someone new, so the form does not reveal who has signed up.

**Start from**: nothing ready-made. `centered-hero` with a `TextInput` and a `Button`.

**Plan and check with**: `/impeccable shape`, `/impeccable clarify`.

**Sources**: [LaunchList, waitlist benchmarks](https://getlaunchlist.com/tools/waitlist-benchmark).

## Account and admin pages

Operate surfaces again, with more at stake: a mistake here locks someone out or charges them.

### Sign-in by emailed code

Two steps: say who you are, then prove it with the code that was sent.

**Regions**

1. The product's mark and a heading that names the task.
2. The email field and Continue.
3. Sign-in with another provider, under a divider.
4. The code step: "sent to" with the address, one field for the code, Resend after a wait, Change
   address.
5. Errors, beside the field they are about.
6. Links to the terms page and the privacy page.

**Rules**

- The code goes in one field with `autocomplete="one-time-code"` and `inputmode="numeric"`, and
  `type="text"` so that a leading zero survives (Twilio).
- An error names the next step: "That code has expired. Send a new one."
- The page does not reveal whether an address has an account.
- Offer a second way in: some people prefer one, and some have their mail on another device
  (NN/g).
- Phone: `inputmode` brings up the number keys, and `autocomplete` lets the browser offer the
  code.
- States: sending, sent with the address repeated, wrong code, expired code, too many tries. Each
  says what to do next, and the button cannot be pressed twice (web.dev).

**Start from**: `login`, `login-card`, `login-sso` (two steps), `login-split`.

**Plan and check with**: `/impeccable harden`, `/impeccable clarify`.

**Sources**:
[NN/g, passwordless accounts](https://www.nngroup.com/articles/passwordless-accounts),
[Twilio, code inputs](https://www.twilio.com/en-us/blog/developers/best-practices/otp-input-forms-html),
[web.dev, sign-in forms](https://web.dev/articles/sign-in-form-best-practices).

### Plan and invoices page

Where a customer sees what they pay for, changes it, and finds their invoices.

**Regions**

1. A banner when something needs doing: a failed charge, a plan that ends on a date.
2. The plan: name, price, renewal date, Change plan.
3. Use this period, against the plan's limits.
4. The card on file.
5. Invoices: date, amount, status, a link to the PDF.
6. Cancel, and Reactivate once cancelled.

**Rules**

- Show the exact charge before a change of plan is confirmed.
- Cancelling takes effect at the end of the paid period and can be undone until then. Say the
  date.
- Only people who may change the plan see the buttons. Everyone else sees the page and who to
  ask.
- Phone: the sections stack, and an invoice row shows date and amount with the rest on tap.
- States: no plan yet offers Choose a plan. A failed charge is a banner with one action. No
  invoices yet says when the first will appear.

**Start from**: nothing ready-made. `settings-sidebar` for the frame; blocks `TableInCard`,
`ProgressBarWithValueLabel`, `BannerWithActionButton`, `RadioListPricingTier`,
`AlertDialogAsyncAction`.

**Plan and check with**: `/impeccable clarify`, `/impeccable harden`.

**Sources**: this layout is convention, as in
[one product's subscription page](https://docs.carbonarc.ai/platform/getting-started/user-portal/plan_and_subscriptions).

### Members and admin tables

Who is in a team or in the product, what each may do, and who has been invited.

**Regions**

1. Header, with Invite.
2. Two tabs: Members, Invitations.
3. Rows: person, role, last active, a menu.
4. The invite dialog: addresses and a role.
5. Confirmation before removing someone.

**Rules**

- The role is chosen in the invite, with the least powerful one selected.
- Nobody can grant a role above their own.
- Say a role in words ("Can edit"), never by colour alone.
- Every change of membership or role writes an entry to the audit trail.
- Phone: a row stacks to the person and their role, with the menu at its end.
- States: a team of one invites its first member from the empty state. An invitation shows as
  pending, expired or failed to send, with Resend.

**Start from**: `table` (sorting, selection, row menus), `table-page`; blocks
`TabListTabsWithBadge`, `TokenizerCreatable` for the addresses, `SelectorShowcase`,
`DialogFormDialog`, `AlertDialogDeleteConfirmation`. Nothing ready-made for the page as a whole.

**Plan and check with**: `/impeccable shape`, `/impeccable harden`.

**Sources**:
[Humbleteam, roles and permissions](https://humbleteam.com/blog/b2b-saas-roles-permissions-ux),
which draws on the documentation of several products.

### Audit trail

A record of who did what and when, for the day someone has to ask.

**Regions**

1. Header: how long entries are kept, and Export.
2. Filters: who, what, to what, and a date range with presets.
3. Rows, newest first: time, who, what they did, to what, from where.
4. The detail of a row: before and after, address, the entry's id.
5. Load older.

**Rules**

- Store a person's name as it was at the time, and a fixed code for each action beside a plain
  label that may be reworded.
- Record attempts that were refused, not only those that succeeded.
- Print the time zone and how long entries are kept on the page.
- Export follows the filters in force and states its limit.
- Phone: a row stacks to time, who and what. The rest is in the detail.
- States: a filter that matches nothing says so and offers Clear filters. Entries older than the
  period kept are not offered.

**Start from**: `table-filter` (it has the detail pane), `table-page`; blocks
`TableRowExpansionTable`, `DateRangeInputWithPresets`, `TimestampTimezone`. Nothing ready-made
for the page as a whole.

**Plan and check with**: none specific. `/impeccable harden` for long names and many rows.

**Sources**:
[Humbleteam, audit logs](https://humbleteam.com/blog/b2b-saas-audit-log-activity-history-ux),
[one product's audit log](https://iadvize.ai/docs/product/organization/audit-logs).

## Emails and notices

What the product says to a person outside a page, and beside the task inside one.

### Transactional emails

A mail the product sends because of something that happened: a sign-in code, a receipt, a
reminder, a digest.

**Regions**

1. Sender: the product's name, from an address a person can reply to.
2. Subject: the event and what identifies it.
3. One line that says why this arrived.
4. The code, or one button.
5. When it expires.
6. "Not you?" and how to reach support.
7. Footer: who sent it.

A receipt adds the amount, the date, how it was paid and a link to the invoice. A reminder says
what and when, with its one action. A digest opens with counts, shows the few items that matter
and ends with a link to change or stop it.

**Rules**

- One mail, one job, one action. Nothing promotional in a receipt.
- Always send a plain-text part in which the code or link works on its own. HTML is optional.
- A code is large, monospaced, selectable text, with its expiry beside it.
- A code in the subject can be read without opening the mail, and by anyone who sees the lock
  screen. Senders' guidance says to keep it out (Resend). Decide once for the product.
- A digest or an announcement carries a link to stop it. Above 5,000 messages a day to Gmail,
  subscribed and promotional mail also needs the one-click unsubscribe header (RFC 8058).
- Send announcements from a stream of their own, so they cannot harm the delivery of codes
  (Postmark).
- Phone: one column, with the purpose and the code or button in the first screen.
- States: a mail cannot show an error, so its text says what to do if the code has expired.

**Start from**: nothing ready-made. Astryx draws pages, not mail.

**Plan and check with**: `/impeccable clarify` for the wording. None for the layout.

**Sources**:
[Gmail, sender guidelines](https://support.google.com/a/answer/81126) and their
[FAQ](https://support.google.com/mail/answer/14229414),
[Postmark, best practices](https://postmarkapp.com/guides/transactional-email-best-practices),
[Resend, transactional emails](https://github.com/resend/email-best-practices/blob/HEAD/references/transactional-emails.md).

### Notifications and announcements

How the product tells someone something: which form, and how much it may interrupt.

**Regions**, from least interrupting to most

1. Inline message: beside the field or section it is about, until the matter is settled.
2. Toast: confirms what the person just did, and leaves on its own.
3. Banner: a state of the page or the account, until that state ends.
4. Notification list: the lasting record of what happened while the person was away.
5. Dialog: a decision that must be made before going on.
6. Email: for someone who is not in the app.

An announcement of something new says what it is, why it matters and how to try it, and links to
its changelog entry.

**Rules**

- Use the least interrupting form that will still be noticed.
- A toast is never the only place an important fact lives, and a toast with an action stays until
  it is dismissed (Carbon).
- One banner at a time (Carbon).
- An error that needs a decision is inline or a banner, never a toast.
- An announcement shows once, can be dismissed, and never interrupts a task in progress.
- Phone: a toast sits clear of the controls under the thumb, and a banner keeps its one action
  when it wraps.
- States: each form has an error variant. The notification list has an empty state that says what
  will appear in it.

**Start from**: blocks `ToastAction`, `ToastStacking`, `BannerDismissable`,
`BannerWithActionButton`, `AppShellWithBanner`, `AlertDialogAsyncAction`. Nothing ready-made for
the notification list.

**Plan and check with**: `/impeccable onboard` for announcing a feature, `/impeccable clarify`.

**Sources**:
[Carbon, notifications](https://www.carbondesignsystem.com/building-blocks/core/patterns/notifications),
[NN/g, tutorials and contextual help](https://www.nngroup.com/articles/onboarding-tutorials).

## Formats that agents read

No open format describes a page's regions and their order, which is why this catalogue is prose.
These are the formats worth using beside it.

- **`DESIGN.md`** describes the look: tokens in YAML, then eight sections of prose in a fixed
  order. It is widely copied, but its specification is still marked alpha, only one design tool
  is documented as reading it unprompted, and its Layout section covers spacing, not page
  structure. A coding agent reads it when `AGENTS.md` points at it. This repository generates one
  at its root. Its command-line tool checks a file for broken references and low contrast
  (`npx @google/design.md lint DESIGN.md`), which is worth adding to the checks.
  [Specification](https://github.com/google-labs-code/design.md).
- **Astryx's own output** is the nearest thing to a layout specification. Adding `--skeleton` to
  the template command prints a template's regions with their padding and gaps, and `--json`
  gives any listing in a typed form. Read the skeleton before changing a template's frame.
- **`AGENTS.md`** tells a coding agent how to work in a repository. This one has it, and it is
  where a pointer to this file belongs. [agents.md](https://agents.md/).
- **The Design Tokens format** (stable since October 2025) is worth using only as an export, for
  the day a design tool must read the brand. The brand file stays the source.
  [Announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version).

Not worth adopting for this purpose: formats in which an agent draws an interface while the
product runs (A2UI and its like), and component manifests from other tool chains. They answer a
different question from "what goes where on this page".
