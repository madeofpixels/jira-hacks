// IMPORTANT: Prior to use, uncomment and define USER_TEMPLATE_URLS and USER_LABELS_AND_STATUSES_TO_FILTERS below.

// USED BY: Inject Custom Template on Create Issue
// Custom templates are stored in https://api.npoint.io – you can define your own custom data source
// by following this structure for all entries: 'PROJECT_CODE': 'URL_TO_TEMPLATE';
// Example:
// const USER_TEMPLATE_URLS = {
// 	Format: 'PROJECT_CODE': 'URL_TO_TEMPLATE'
// 	'ABC': 'https://api.npoint.io/656bccf0972ed60b7bba', // Edit template at https://www.npoint.io/docs/656bccf0972ed60b7bba
// }

// Uncomment and add your Jira project/JSON template pairing(s):
// const USER_TEMPLATE_URLS = {
// 	'PROJECT_CODE': 'URL_TO_TEMPLATE',
// }

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

// Uncomment and add your Jira label/filter pairing(s):
// const USER_LABELS_AND_STATUSES_TO_FILTERS = {
// 	'LABEL_OR_STATUS_NAME': 'FILTER_NAME'
// };

/*===== Jira (Epics): Display Smart Checklists below the Description field =====*/
function makePositionSmartChecklist() {
	const _positionSmartChecklist = function() {
		const smartChecklist = document.querySelector('div[class="sc-185kjqv-0 diozqf"]');
		if (smartChecklist === null) return false;
		
		const smartChecklistWrapper = smartChecklist.closest('.ei7vuq-0.LlqtS');
		
		// Uncomment next line to position the list immediately below the description field
		const anchorElt = document.querySelector('div[class="nla5ek-1 gRMXld"]');
		
		// Uncomment next line to position the list at the top of the right column
		//const anchorElt = document.querySelector('div[class="sc-1njt3iw-0 klZhqF"]');
		
		anchorElt.insertAdjacentElement('afterend', smartChecklistWrapper);
	}

	return ({
		init: () => { setTimeout(_positionSmartChecklist, 1000); } // Short delay, window onload prevents the SC element from initializing
	});
}

/*===== Jira: Inject Custom Template on Create Issue =====*/
function makeCustomTemplateInjector() {
	const CREATE_ISSUE_MUTATION_CONFIG = {attributes: true, childList: true, subtree: true};

	let currProjectCode;

	const _fetchProjectTemplates = async function(projectCode, _callback = undefined) {
		const templateSource = (localStorage.getItem('templates-all-projects') != null) ? JSON.parse(localStorage.getItem('templates-all-projects')) : USER_TEMPLATE_URLS;
		const requestURL = templateSource[projectCode];

		if (localStorage.getItem('template-' + projectCode) !== null || requestURL == undefined) {
			// Don't re-fetch if in same project or the project code is undefined
			typeof(_callback) == 'function' && _callback(projectCode);
			return;
		}
		
		const request = new Request(requestURL);
		
		try {
			const response = await fetch(request);
			const jsonResponse = await response.json();
			
			if (typeof jsonResponse == 'object') {
				localStorage.setItem('template-' + projectCode, JSON.stringify(jsonResponse));
			} else {
				throw new Error('_fetchProjectTemplates::Invalid JSON response');
			}
			
			typeof(_callback) == 'function' && _callback(projectCode);
		} catch (e) {
			console.error('Error fetching templates: ', e);
		}
	}
	
	const _listenForCreateIssueMutations = function(e) {
		setTimeout(() => {
			const createIssueMutationNode = document.getElementById('issue-create-modal-dropzone-container');
			
			if (createIssueMutationNode != null) {
				createIssueObserver.observe(createIssueMutationNode, CREATE_ISSUE_MUTATION_CONFIG);
			}
		}, 100); // Wait for the Create Issue modal to render
	}

	const _getIssueTemplate = function() {
		const projectCodePicker = document.getElementById('issue-create.ui.modal.create-form.project-picker.project-select');
		const lastCloseEllipseDivIndex = projectCodePicker.innerHTML.lastIndexOf(')</div>'); // ex: "...ABC Team (ABC)</div>..."
		const projectCodeFragment = projectCodePicker.innerHTML.slice(0, lastCloseEllipseDivIndex);
		const lastOpenEllipseIndex = projectCodeFragment.lastIndexOf('(');
		const selectedDDProjectCode = (projectCodeFragment && projectCodeFragment.slice(lastOpenEllipseIndex + 1)) || null;
		
		if (selectedDDProjectCode && selectedDDProjectCode != currProjectCode) {
			const createDescriptionField = document.querySelector('.ak-editor-content-area div[aria-label="Main content area"]');			
			createDescriptionField.innerHTML = 'Loading template...';
			_fetchProjectTemplates(selectedDDProjectCode, _injectIssueTemplate);
		} else {
			_injectIssueTemplate(currProjectCode);
		}
	}
	
	const _injectIssueTemplate = function(projectCode) {
		const createDescriptionField = document.querySelector('.ak-editor-content-area div[aria-label="Main content area"]');
		
		if (localStorage.getItem('template-' + projectCode) == null) {
			createDescriptionField.innerHTML = '';
			return;
		}
		
		const issueTypePicker = document.getElementById('issue-create.ui.modal.create-form.type-picker.issue-type-select')
			.querySelector('.css-hkzqy0-singleValue > div > div:nth-child(2) > div');
		const selectedIssueType = (issueTypePicker && issueTypePicker.innerHTML) || null;
		const currProjectTemplates = JSON.parse(localStorage.getItem('template-' + projectCode));

		if (selectedIssueType != null && currProjectTemplates[selectedIssueType] != undefined) {
			createDescriptionField.innerHTML = currProjectTemplates[selectedIssueType];
		} else {
			createDescriptionField.innerHTML = ''; // Clear the loading state
		}

		// Wait for the modal body to render
		setTimeout(() => { document.querySelector('div[data-testid="issue-create.ui.modal.modal-wrapper.modal--scrollable"]').scrollTop = 0; }, 10);
	}
	
	const _onCreateIssueMutation = function(mutationList, createIssueObserver) {
		for (const mutation of mutationList) {
			if (mutation.target.className.includes('ak-editor-content-area') && mutation.type == 'childList') { // Create Issue description field has rendered
				_getIssueTemplate();
				return;
			}
			
			if (mutation.target.className == "ua-chrome" && mutation.removedNodes.length > 0) { // Create Issue modal is closing, tidy up
				const modalBody = document.getElementById('issue-create.ui.modal.modal-body');
				if (modalBody == null) { createIssueObserver.disconnect(); }
				return;
			}
		}
	}

	const createIssueObserver = new MutationObserver(_onCreateIssueMutation);
	
	const _clearTemplatesIfExpired = function () {
		// Force expiry of stored templates every 7 days, to ensure "permanently opened" tabs receive version updates
		if (localStorage.getItem('templates-created-on-date') !== null) {
			const templatesCreatedOnDate = new Date(localStorage.getItem('templates-created-on-date'));
			const currDate = new Date();
			const diffDatesByTime = currDate.getTime() - templatesCreatedOnDate.getTime();
			const diffDatesByDays = diffDatesByTime / (1000 * 3600 * 24);
			
			if (diffDatesByDays > 7) { // Invalidate stored templates that are older than 7 days
				for (key in localStorage) {
					if (key.search(/^(template)(s?)(-)/) == 0) { 
						localStorage.removeItem(key);
					}
				}
				
				localStorage.setItem('templates-created-on-date', new Date());
			}
		} else { // First time, store the date
			localStorage.setItem('templates-created-on-date', new Date());
		}
	}

	const _getProjectTemplateUrls = async function (_callback = undefined) {
		_clearTemplatesIfExpired();
		
		if (localStorage.getItem('templates-all-projects') != null || typeof(USER_TEMPLATE_URLS) != 'undefined') {
			// Use the stored templates
			typeof(_callback) == 'function' && _callback();
		} else if (typeof(REMOTE_PROJECT_TEMPLATES_URL) != 'undefined' && localStorage.getItem('templates-all-projects') == null) {
			try {
				const request = new Request(REMOTE_PROJECT_TEMPLATES_URL);
				const response = await fetch(request);
				const jsonResponse = await response.json();
				
				if (typeof jsonResponse == 'object') {
					localStorage.setItem('templates-all-projects', JSON.stringify(jsonResponse));
				} else {
					throw new Error('getProjectTemplateUrls::Invalid JSON response');
				}
				
				typeof(_callback) == 'function' && _callback();
			} catch (e) {
				console.error('Error fetching templates: ', e);
			}
		}
	}

	const _onUpdate = function() {
		let newProjectPathname = window.location.pathname.split('projects/');
		let newProjectCode = newProjectPathname.length == 1 ? undefined : newProjectPathname[1].split('/')[0];

		// Click event listeners are removed (ie: switching to the same project), re-add
		setTimeout(() => {
			document.getElementById('createGlobalItem').addEventListener('click', _listenForCreateIssueMutations);
			document.getElementById('createGlobalItemIconButton').addEventListener('click', _listenForCreateIssueMutations);
		}, 10); // Wait for the buttons to re-render

		if (newProjectCode == undefined) {
			return; 
		}
		
		_getProjectTemplateUrls(() => {
			if (newProjectCode != currProjectCode) { // Switching projects
				currProjectCode = newProjectCode;
				_fetchProjectTemplates(currProjectCode);
			}
		});
	}

	const _init = function() {
		_onUpdate();
		window.addEventListener('locationchange', _onUpdate);
	}

	return ({
		init: () => { _init(); }
	});
}

/*===== Jira: Display Filter Badge Counts =====*/
function makeFilterBadges() {
	const BOARD_MUTATION_CONFIG = {attributes: false, childList: true, subtree: true};

	let labelsAndStatusesToFiltersMap = {};
	let boardMutationNode;
	let isBoardUpdateInProgress = false;
	let quickFiltersSection;
	let quickFiltersToggle;
	let currProjectPathname;

	const _createBadge = function(count) {
		const badge = document.createElement('span');
		badge.classList.add('badge');
		badge.innerHTML = count;
		return badge;
	}

	const _getCardLabelAndStatusCounts = function() {
		// App view has changed, empty existing object values
		for (const [label, props] of Object.entries(labelsAndStatusesToFiltersMap)) { props.count = 0; }

		const allCardLabels = document.querySelectorAll('span[data-tooltip^="Labels:"]');

		allCardLabels.forEach(
			cardLabels => {
				cardLabels.outerText.split(', ').forEach(label => {
					labelsAndStatusesToFiltersMap[label] && labelsAndStatusesToFiltersMap[label].count++;
				});
			}
		);
		
		const allCardStatuses = document.querySelectorAll('span[data-tooltip^="Status:"]');
		
		allCardStatuses.forEach(
			status => {
				labelsAndStatusesToFiltersMap[status.outerText] && labelsAndStatusesToFiltersMap[status.outerText].count++;
			}
		);
	}
	
	const _addBadgesToFilters = function() {
		let currBadge;
		let filterElt;
		
		for (const [label, props] of Object.entries(labelsAndStatusesToFiltersMap)) {
			filterElt = document.evaluate('.//span[text()="' + props.filterName + '"]', document.querySelector('#ghx-quick-filters'), null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

			if (filterElt == null) { continue; }
			
			if (props.count > 0) { // Update filter if count > 0
				if (filterElt.childNodes.length == 1) {
					currBadge = _createBadge(props.count);
					props.badge = currBadge; // Store a ref to the badge
					filterElt.appendChild(props.badge);
				} else {
					props.badge.innerHTML = props.count;
				}
			} else {
		  		if (filterElt.childNodes.length > 1) {
		  			filterElt.removeChild(props.badge);
		  			props.badge = null;
		  		}
			}
		}
	}
	
	const _enableBoardObserver = function() {
		boardMutationNode = document.getElementById('ghx-content-main');
		boardMutationNode && boardObserver.observe(boardMutationNode, BOARD_MUTATION_CONFIG);
	}
	
	const _onBoardMutation = function(mutationList, boardObserver) {
		if (isBoardUpdateInProgress) { return; }
		
		boardObserver.disconnect();
		_onUpdate();
	}
	
	const boardObserver = new MutationObserver(_onBoardMutation);
	
	const _getFilterNames = function () {
		let filterButtons = document.querySelectorAll('#ghx-quick-filters ul:nth-child(2) button');
		filterButtons = (filterButtons.length == 0) ? document.querySelectorAll('#ghx-quick-filters ul:nth-child(1) li:nth-child(3) button') : filterButtons;
		
		labelsAndStatusesToFiltersMap = {}; // Reset as app view has changed
		
		// Map user-defined entries first (ex: Label name = 'None', Filter name = 'No Labels')
		for (const [labelOrStatusName, filterName] of Object.entries(USER_LABELS_AND_STATUSES_TO_FILTERS)) {
			labelsAndStatusesToFiltersMap[labelOrStatusName] = {filterName:filterName, badge: null, count: 0};
		}
		
		// Next iterate through the filters (names) and map label names 1:1 for items that haven't already been defined above
		filterButtons.forEach(
			filterButton => {
				if (!Object.values(USER_LABELS_AND_STATUSES_TO_FILTERS).includes(filterButton.outerText)) {
					labelsAndStatusesToFiltersMap[filterButton.outerText] = {filterName:filterButton.outerText, badge: null, count: 0};
				}
			}	
		);
	}

	const _onUpdate = function() {
		if (isBoardUpdateInProgress) { return; }
		isBoardUpdateInProgress = true;
		
		setTimeout(() => {
			quickFiltersSection = document.querySelector('#ghx-quick-filters ul:first-child');
			quickFiltersToggle = document.evaluate("//button[contains(., 'Quick filters')]", quickFiltersSection, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

			if (quickFiltersToggle) {
				let filterButtons = document.querySelectorAll('#ghx-quick-filters ul:nth-child(2) button');

				if (!filterButtons.length) { // Toggle open the filter list only if it is visible and the quick filters button exists
					quickFiltersToggle.click();
					_getFilterNames();
				}
			}

			if (currProjectPathname == null || currProjectPathname != window.location.pathname) {
				currProjectPathname = window.location.pathname;
				_getFilterNames();
			}
			
			const filterNodesInDOM = document.querySelectorAll('#ghx-quick-filters ul').length >= 2; // Quick filters (search, filter) spans across two lists

			if (filterNodesInDOM) { 
				_getCardLabelAndStatusCounts();
				_addBadgesToFilters();
			}

			isBoardUpdateInProgress = false;
			_enableBoardObserver()
		}, 1250); // This isn't an exact science...
	}

	const _init = function(e) {
		_onUpdate();
		window.addEventListener('locationchange', _onUpdate);
	}

	return ({
		init: () => { _init(); }
	});
}

// Listen for custom 'locationchange' event on URL change
;(function() {
	let pushState = history.pushState;
	let replaceState = history.replaceState;

	history.pushState = function() {
		pushState.apply(history, arguments);
		window.dispatchEvent(new Event('pushstate'));
		window.dispatchEvent(new Event('locationchange'));
	};

	history.replaceState = function() {
		replaceState.apply(history, arguments);
		window.dispatchEvent(new Event('replacestate'));
		window.dispatchEvent(new Event('locationchange'));
	};

	window.addEventListener('popstate', function() {
		window.dispatchEvent(new Event('locationchange'))
	});
})();

function makeJiraHacks() {
	const isJiraPage = document.getElementById('jira') != null;

	let customTemplateInjector;
	let filterBadges;

	const initJiraHacks = function() {
		/*===== Jira (Epics): Inject Custom Template on Create Issue =====*/
		customTemplateInjector = makeCustomTemplateInjector();
		customTemplateInjector.init();
		
		/*===== Jira: Filtered card count badge =====*/
		filterBadges = makeFilterBadges();
		filterBadges.init();
	}
	
	const _init = function() {
		if (isJiraPage) {
			/*===== Jira (Epics): Display Smart Checklists below the Description field =====*/
			// Note: This breaks when executing on window.onload, but works with a 1s timeout
			const positionSmartChecklist = makePositionSmartChecklist();
			positionSmartChecklist.init();
		
			window.onload = initJiraHacks;
		}			
	}
	
	return ({
		init: () => { _init(); }
	});
}

const jiraHacks = makeJiraHacks();
jiraHacks.init();
