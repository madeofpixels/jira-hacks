# jira-hacks

Contained within are some useful hacks to help make content creation easier in Jira and Confluence.
- [Jira: Inject a custom template on issue creation](https://github.com/madeofpixels/jira-hacks/blob/main/README.md#jira-inject-a-custom-template-on-issue-creation)
- [Jira: Display filter badge counts](https://github.com/madeofpixels/jira-hacks/blob/main/README.md#jira-display-filter-badge-counts)
- [Jira & Confluence: Keep the editor tools visible on-screen](https://github.com/madeofpixels/jira-hacks/blob/main/README.md#jira--confluence-keep-the-editor-tools-visible-on-screen)
- [Jira: Display smart checklists below the Description field](https://github.com/madeofpixels/jira-hacks/blob/main/README.md#jira-display-smart-checklists-below-the-description-field)

---

## Getting Started

These hacks require a means of injecting customized JavaScript and CSS code into the DOM — use your preferred browser extension (or bookmarklet, etc.) to accomplish this. To illustrate how to use the hacks, Chrome's User JavaScript and CSS extension is used below.

1. Install your preferred custom JavaScript/CSS browser extension
2. Navigate to the site you want to customize. Ex: for Jira, open your Team’s backlog page:

   https://company.atlassian.net/jira/software/c/projects/ABC/boards/123/backlog
   
3. Click on the extension's icon in your browser bar (red arrow below) and click the + Add new button:

   ![alt text](https://github.com/madeofpixels/jira-hacks/blob/main/readme/all-chrome-extensions.png "All Chrome extensions")

   — this will open a new tab with two panes (left = custom JavaScript, right = custom CSS). Ex:

   ![alt text](https://github.com/madeofpixels/jira-hacks/blob/main/readme/user-javascript-css-extension.png "User JS CSS view panes")

   _Note:_ If the extension doesn't automatically appear in your Chrome browser, click the Extensions icon (green arrow above) then click on the pin icon next to User JavaScript and CSS.

4. Copy & paste the following code block into the browser extension’s `JavaScript` pane and modify the `REQUEST_URLS` and `COLOR_FILTER_MAP` objects to suit your project:

```javascript
let cssElt = document.createElement('link');
cssElt.href = 'https://cdn.jsdelivr.net/gh/madeofpixels/jira-hacks@latest/main.min.css';
cssElt.type = 'text/css';
cssElt.rel = 'stylesheet';
document.head.append(cssElt);

// USED BY: Inject Custom Template on Create Issue
// Custom templates are stored in https://api.npoint.io – you can define your own custom data source
// by following this structure for all entries: 'PROJECT_CODE': 'URL_TO_TEMPLATE';
// Example:
// const USER_TEMPLATE_URLS = {
// 	Format: 'PROJECT_CODE': 'URL_TO_TEMPLATE'
// 	'ABC': 'https://api.npoint.io/656bccf0972ed60b7bba', // Edit template at https://www.npoint.io/docs/656bccf0972ed60b7bba
// }

const USER_TEMPLATE_URLS = {
	'PROJECT_CODE': 'URL_TO_TEMPLATE',
}

// USED BY: Display Filter Badge Counts
// Add an entry per label/status to track the number of cards that satisfy that filter criteria by following this 
// structure for all entries: 'LABEL_NAME': 'FILTER_NAME'
// Label names are derived from label value(s) on your Jira issues
// Filter names are derived from the [Board settings > Quick Filters > Name] values (ex: No Labels)
// Note: Counts are created for all 'straightforward' labels and statuses (ie: map 1:1 and rely on the label/status name)
// Example:
// const USER_LABELS_AND_STATUSES_TO_FILTERS = {
// 	Format: 'LABEL_OR_STATUS_NAME': 'FILTER_NAME'
// 	'None': 'No Labels',
// 	'In Development': 'In Development'
// };

const USER_LABELS_AND_STATUSES_TO_FILTERS = {
	'LABEL_OR_STATUS_NAME': 'FILTER_NAME'
};

const jsElt = document.createElement('script');
jsElt.src = 'https://cdn.jsdelivr.net/gh/madeofpixels/jira-hacks@latest/main.min.js';
jsElt.type = 'text/javascript';
jsElt.defer = true;
document.body.append(jsElt);
```

5. Reload your (Jira/Confluence) browser tab to enable the hacks detailed below:

## The Jira / Confluence Hacks

### Jira: Inject a custom template on issue creation

```javascript
/*===== Jira: Inject Custom Template on Create Issue =====*/
function makeCustomTemplateInjector() {
```

_Problem:_ While Jira Automation allows you to add a custom template to a new issue, this occurs after the issue is been created. Unfortunately, if you open and modify the issue’s Description field prior to the automation completing, this can lead to either (i) your content being overwritten, or (ii) you overwriting the automated template.

_Solution:_ This hack injects a pre-defined custom template into the Description field when the issue is being created. Templates can be defined for any of Jira’s issue types (ex: Story, Bug, Spike, Epic), across multiple Jira projects. While it's possible to accomplish this using ScriptRunner to add a custom behaviour, at present, this is unavailable in Jira Cloud.

   ![alt text](https://github.com/madeofpixels/jira-hacks/blob/main/readme/jira-custom-template.png "Jira custom template")

_Note:_ Templates should be stored externally in JSON format, as defined in the `REQUEST_URLS` object (see [Getting Started](https://github.com/madeofpixels/jira-hacks/blob/main/README.md#getting-started) above). An object should be defined for each project, including unique templates for any (used) issue types (ex: Story, Bug, Epic, etc) of your choosing. Example JSON file: [https://www.npoint.io/docs/656bccf0972ed60b7bba](https://www.npoint.io/docs/656bccf0972ed60b7bba)

---

### Jira: Display filter badge counts

```javascript
/*===== Jira: Display Filter Badge Counts =====*/
function makeFilterBadges() {
```

_Problem:_ While the custom filters are useful at providing focus, they don’t display how many items satisfy the filter criteria. For labels that call attention to items, it’s not apparent to the recipient that there are issues that require their attention — without first applying the filter.

_Solution:_ This hack adds badge counts to user-specified filters (ex: `Team-Review`, `Unpointed`) when viewing a project’s Backlog or Sprint Board.

   ![alt text](https://github.com/madeofpixels/jira-hacks/blob/main/readme/jira-badges.png "Jira badges")

_Note:_ To add / modify the list of filters where badge counts should be applied, modify the `COLOR_FILTER_MAP` object (see [Getting Started](https://github.com/madeofpixels/jira-hacks/blob/main/README.md#getting-started) above).

---

### Jira & Confluence: Keep the editor tools visible on-screen

```css
/*===== Jira, Confluence: Keep the editor tools on-screen =====*/
/* Jira: Edit Toolbar */
#jira div[data-testid="ak-editor-main-toolbar"] {
```

_Problem:_ The editor toolbar scrolls out of view when editing a content-heavy ticket.

_Solution:_ This hack fixes the position of the editor toolbar, so it always stays visible while editing the Description field or adding a comment.

   ![alt text](https://github.com/madeofpixels/jira-hacks/blob/main/readme/jira-confluence-edit-toolbar.png "Jira & Confluence edit toolbar")

---

### Jira: Display Smart Checklists below the Description field

```javascript
/*===== Jira (Epics): Display Smart Checklists below the Description field =====*/
function makePositionSmartChecklist() {
```

_Problem:_ For content-heavy Epics (ex: description, linked items, tickets, …), the Smart Checklist appears close to the bottom of the ticket, “burying” important dependency-related information. 

_Solution:_ This hack moves the Smart Checklist immediately below the Description.

   ![alt text](https://github.com/madeofpixels/jira-hacks/blob/main/readme/jira-position-smart-checklist.png "Jira (Epics) position smart checklist")
