// IMPORTANT: Prior to use, define REQUEST_URLS and COLOR_FILTER_MAP below.

/* USED BY: Inject Custom Template on Create Issue
Custom templates are stored in https://api.npoint.io – you can define your own custom data source
by following this structure for all entries: 'PROJECT_CODE': 'WEB_URL';

Example:

const REQUEST_URLS = {
	'ABC': 'https://api.npoint.io/656bccf0972ed60b7bba', // Edit template at https://www.npoint.io/docs/656bccf0972ed60b7bba
}
*/

// Uncomment and add your jira project/json template pairing(s):
// const REQUEST_URLS = {
// 	'PROJECT': 'https://URL_TO_TEMPLATES',
// }

/* USED BY: Display Filter Badge Counts
Add an entry per filter to track the number of cards that satisfy that filter criteria by following this 
structure for all entries: 
'#HEX_VALUE': {xpath: '//span[contains(text(),"FILTER_TEXT")]', badge: null, count: 0}

The hex key is taken from the [Board settings > Card colors > Color] value (ex: '#35d415')
The xpath string is comes from the [Board settings > Card colors > Quick Filters] filter name (ex: Unpointed)

Example:

const COLOR_FILTER_MAP = {
	'#cccccc': {xpath: '//span[contains(text(),"Unpointed")]', badge: null, count: 0}
	, '#ee9900': {xpath: '//span[contains(text(),"No Labels")]', badge: null, count: 0}
};
*/

// Uncomment and add your color/filter pairing(s):
// const COLOR_FILTER_MAP = {
// 	'#HEXVAL': {xpath: '//span[contains(text(),"SOME_TEXT")]', badge: null, count: 0}
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
	
	let currProjectPathname;
	let currProjectCode;

	const _fetchTemplates = async function(projectCode, _callback = undefined) {
		// Force expiry of stored templates every 7 days, to ensure "permanently opened" tabs receive version updates
		if (sessionStorage.getItem('templates-created-on-date') !== null) {
			const templatesCreatedOnDate = new Date(sessionStorage.getItem('templates-created-on-date'));
			const currDate = new Date();
			const diffDatesByTime = currDate.getTime() - templatesCreatedOnDate.getTime();
			const diffDatesByDays = diffDatesByTime / (1000 * 3600 * 24);
			
			if (diffDatesByDays > 7) { // Invalidate stored templates that are older than 7 days
				for (key in sessionStorage) { 
					if (key.indexOf('template-') == 0) { 
						sessionStorage.removeItem(key);
					}
				}
				
				sessionStorage.setItem('templates-created-on-date', new Date());
			}
		} else { // New session, store the date
			sessionStorage.setItem('templates-created-on-date', new Date());
		}
		
		if (sessionStorage.getItem('template-' + projectCode) !== null || REQUEST_URLS[projectCode] == undefined) {
			// Don't re-fetch if in same project or the project code is undefined
			typeof(_callback) == 'function' && _callback(projectCode);
			return;
		}
		
		const requestURL = (REQUEST_URLS[projectCode] == undefined) ? REQUEST_URLS['DEFAULT'] : REQUEST_URLS[projectCode];
		const request = new Request(requestURL);
		
		try {
			const response = await fetch(request);
			const jsonResponse = await response.json();
			
			if (typeof jsonResponse == 'object') {
				sessionStorage.setItem('template-' + projectCode, JSON.stringify(jsonResponse));
			}
			
			typeof(_callback) == 'function' && _callback(projectCode);
		} catch (e) {
			console.error('Error fetching templates: ', e);
		}
	}
	
	const _listenForCreateIssueMutations = function(e) {
		setTimeout(() => {
			const createIssueMutationNode = document.querySelector('.css-1jesbqk.e1pwmxs01');
			
			if (createIssueMutationNode != null) {
				createIssueObserver.observe(createIssueMutationNode, CREATE_ISSUE_MUTATION_CONFIG);
			}
		}, 1); // Wait for the next tick (ie: Create Issue modal to render)
	}

	const _getIssueTemplate = function() {
		const projectCodePicker = document.querySelector('.i3zfbj-0.isaQiP .xkgbo7-3.aWXco');
		const lastEllipseIndex = projectCodePicker.innerHTML.lastIndexOf('(');
		const selectedDDProjectCode = (projectCodePicker && projectCodePicker.innerHTML.slice(lastEllipseIndex + 1).split(')')[0]) || null;
		
		let projectCodeToUse;
		
		if (selectedDDProjectCode && selectedDDProjectCode != currProjectCode) {
			projectCodeToUse = selectedDDProjectCode;
			
			const createDescriptionField = document.querySelector('.ak-editor-content-area div[aria-label="Main content area"]');
			createDescriptionField.innerHTML = 'Loading template...';
			
			_fetchTemplates(projectCodeToUse, _injectIssueTemplate);
		} else {
			projectCodeToUse = currProjectCode;
			_injectIssueTemplate(projectCodeToUse);
		}
	}
	
	const _injectIssueTemplate = function(projectCode) {
		const createDescriptionField = document.querySelector('.ak-editor-content-area div[aria-label="Main content area"]');
		
		if (sessionStorage.getItem('template-' + projectCode) == null) {
			createDescriptionField.innerHTML = '';
			return;
		}
		
		const issueTypePicker = document.querySelector('.i3zfbj-0.bnTrzr .xkgbo7-3.aWXco');
		const selectedIssueType = (issueTypePicker && issueTypePicker.innerHTML) || null;
		const currProjectTemplates = JSON.parse(sessionStorage.getItem('template-' + projectCode));

		switch (selectedIssueType) {
			case 'Bug': createDescriptionField.innerHTML = currProjectTemplates.Bug; break;
			case 'Story': createDescriptionField.innerHTML = currProjectTemplates.Story; break;
			case 'Spike': createDescriptionField.innerHTML = currProjectTemplates.Spike; break;
			case 'Epic': createDescriptionField.innerHTML = currProjectTemplates.Epic; break;
			default: createDescriptionField.innerHTML = ''; break;
		}
		
		setTimeout(() => { document.getElementById('issue-create.ui.modal.modal-body').scrollTop = 0; }, 1); // Wait for the next tick (ie: modal body to render)
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
	
	const _onUpdate = function() {
		let newProjectPathname = window.location.pathname.split('projects/');
		let newProjectCode = newProjectPathname.length == 1 ? undefined : newProjectPathname[1].split('/')[0];

		// Click event listeners are removed (ie: switching to the same project), re-add
		setTimeout(() => {
			document.getElementById('createGlobalItem').addEventListener('click', _listenForCreateIssueMutations);
			document.getElementById('createGlobalItemIconButton').addEventListener('click', _listenForCreateIssueMutations);
		}, 1); // Wait for the next tick (ie: buttons to re-render)

		if (newProjectCode == undefined) {
			return; 
		}
		
		if (newProjectCode != currProjectCode) { // Switching projects
			currProjectCode = newProjectCode;
			_fetchTemplates(currProjectCode);
		}
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

	let currFilterNodes;
	let boardMutationNode;
	let isBoardUpdateInProgress = false;

	const _componentToHex = function(c) {
	  var hex = parseInt(c).toString(16);
	  return hex.length == 1 ? '0' + hex : hex;
	}
	
	const _rgbToHex = function(rgbArr) {
	  return '#' + _componentToHex(rgbArr[0]) + _componentToHex(rgbArr[1]) + _componentToHex(rgbArr[2]);
	}
	
	const _createBadge = function(colorKey, count) {
	  const badge = document.createElement('span');
	  badge.classList.add('badge');
	  badge.innerHTML = count;
	  return badge;
	}
	
	const _getGrabberCounts = function() {
		const grabbers = document.querySelectorAll('div[class=ghx-grabber]');
		
		// Reset grabber counts (ie: in case they have dynamically changed)
	    for (const [colorKey, props] of Object.entries(COLOR_FILTER_MAP)) { props.count = 0; }
	
		// Tally the counts for each filter type
		grabbers.forEach(
		  elt => {
		    const eltColor = _rgbToHex(elt.style.backgroundColor.replace('rgb(','').replace(')','').split(','));
		    if (COLOR_FILTER_MAP[eltColor]) { COLOR_FILTER_MAP[eltColor].count++; }
		  }
		);
	}
	
	const _addBadgesToFilters = function() {
		if (currFilterNodes.length == 0) { // Filters are not visible
			return;
		}
		
		let currBadge;
		let filterElt;
		
		for (const [colorKey, props] of Object.entries(COLOR_FILTER_MAP)) {
			filterElt = document.evaluate(props.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
	
			if (filterElt == null) { continue; }
			
			if (props.count > 0) { // Only update filter counts > 0
			    if (filterElt.childNodes.length == 1) {
			    	currBadge = _createBadge(colorKey, props.count);
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
	
	const _onUpdate = function() {
		if (isBoardUpdateInProgress) { return; }
		isBoardUpdateInProgress = true;
		
		setTimeout(() => {
			// Store all filter nodes - this list changes when App view changes
			currFilterNodes = document.getElementsByClassName('sc-11jaxx1-0 LppZN');

			// If the board/backlog filter list is present and closed, open it
			const backlogFilterToggle = document.querySelector('div#ghx-quick-filters .jdgrw0-0.bsBhhk > button.css-7uss0q');
			backlogFilterToggle && backlogFilterToggle.click();

			_getGrabberCounts();
			_addBadgesToFilters();
			
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
