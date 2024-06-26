// USED BY: Inject Custom Template on Create Issue
// Custom templates are stored in https://api.npoint.io – you can define your own custom data source
// by following this structure for all entries: 'PROJECT_CODE': 'URL_TO_TEMPLATE';
// Example:
// const USER_TEMPLATE_URLS = {
//     Format: 'PROJECT_CODE': 'URL_TO_TEMPLATE'
//     'ABC': 'https://api.npoint.io/656bccf0972ed60b7bba', // Edit template at https://www.npoint.io/docs/656bccf0972ed60b7bba
// }
//
// Uncomment and add your Jira project/JSON template pairing(s):
// var USER_TEMPLATE_URLS = {
//     'PROJECT_CODE': 'URL_TO_TEMPLATE',
// }
//
// Set how long the local templates are stored before refreshing them (default: 7 days)
// var USER_TEMPLATE_EXPIRE_AFTER_DAYS = 0;


/*===== Jira: Custom Template Injector on Create Issue =====*/
function hackCustomTemplateInjector() {
    const CREATE_ISSUE_MUTATION_CONFIG = {attributes: true, childList: true, subtree: true};

    let currProjectCode;

    const _storeProjectTemplatesLocally = async function(projectCode, _callback = undefined) {
		const requestURL = USER_TEMPLATE_URLS[projectCode];
		
		if (localStorage.getItem('JIRAHACK-template-' + projectCode) !== null || requestURL == undefined) {
			typeof(_callback) == 'function' && _callback(projectCode);
			return;
		}
		
		const request = new Request(requestURL);
		
		try {
			const response = await fetch(request);
			const jsonResponse = await response.json();
			
			if (typeof jsonResponse == 'object') {
				localStorage.setItem('JIRAHACK-template-' + projectCode, JSON.stringify(jsonResponse));
			} else {
				throw new Error('_storeProjectTemplatesLocally::Invalid JSON response');
			}
			
			typeof(_callback) == 'function' && _callback(projectCode);
		} catch (e) {
			console.error('Error fetching templates: ', e);
		}
    };
    
    const _listenForCreateIssueMutations = function(e) {
		const minimizedCreateIssueNode = document.getElementById('minimised-issue-create-dropzone-container');
		
		// Don't disconnect the observer if the minimized Create Issue button is rendered on load
		if (minimizedCreateIssueNode == null) { createIssueObserver.disconnect(); }

		setTimeout(() => {
			const createIssueMutationNode = document.getElementById('issue-create-modal-dropzone-container');

			if (createIssueMutationNode != null) {
				createIssueObserver.observe(createIssueMutationNode, CREATE_ISSUE_MUTATION_CONFIG);
			}
		}, 100); // Wait for the Create Issue modal to render
    };

    const _getIssueTemplate = function() {
		const projectCodePicker = document.getElementById('issue-create.ui.modal.create-form.project-picker.project-select');
		const selectedDDProjectCode = projectCodePicker && projectCodePicker.innerText.split('(')[1].split(')')[0]; // Ex: "Team Project (ABC)"
		
		const createDescriptionField = document.getElementById('ak-editor-textarea');
		createDescriptionField.innerText = 'Loading template...';
		
		if (selectedDDProjectCode && selectedDDProjectCode != currProjectCode) {
			_storeProjectTemplatesLocally(selectedDDProjectCode, _injectIssueTemplate);
		} else {
			_storeProjectTemplatesLocally(currProjectCode, _injectIssueTemplate);
		}
    };
    
    const _injectIssueTemplate = function(projectCode) {
		const createDescriptionField = document.getElementById('ak-editor-textarea');
		
		if (localStorage.getItem('JIRAHACK-template-' + projectCode) == null) {
			createDescriptionField.innerHTML = '';
			return;
		}

		const issueTypePicker = document.getElementById('issue-create.ui.modal.create-form.type-picker.issue-type-select');
		const selectedIssueType = (issueTypePicker && issueTypePicker.innerText) || null;
		const currProjectTemplates = JSON.parse(localStorage.getItem('JIRAHACK-template-' + projectCode));
		
		if (selectedIssueType != null && currProjectTemplates[selectedIssueType] != undefined) {
			createDescriptionField.innerHTML = currProjectTemplates[selectedIssueType];
		} else {
			createDescriptionField.innerHTML = ''; // Clear the loading state
		}
		
		// Wait for the modal body to render
		setTimeout(() => {
			// First node: Full screen modal, Second: Bottom creation pane
			const scrollableContent = document.querySelector('div[data-testid="issue-create.ui.modal.modal-wrapper.modal--scrollable"]') || document.querySelector('div[data-testid="minimizable-modal.ui.modal-container.mini"]').childNodes[1]; 
			scrollableContent && (scrollableContent.scrollTop = 0);
		}, 10);
    };
    
    const _onCreateIssueMutation = function(mutationList, createIssueObserver) {
		for (const mutation of mutationList) {
			if (mutation.target.className.includes('ak-editor-content-area') && mutation.type == 'childList') { // Create Issue description field has rendered
				_getIssueTemplate();
				return;
			}		
		}
    };

    const createIssueObserver = new MutationObserver(_onCreateIssueMutation);
    
    const _checkTemplatesForExpiration = function (expireAfterDays = 7) {
		// Force expiry of stored templates to ensure "permanently opened" tabs receive version updates
		if (localStorage.getItem('JIRAHACK-templates-created-on-date') !== null) {
			const templatesCreatedOnDate = new Date(localStorage.getItem('JIRAHACK-templates-created-on-date'));
			const currDate = new Date();
			const diffDatesByTime = currDate.getTime() - templatesCreatedOnDate.getTime();
			const diffDatesByDays = diffDatesByTime / (1000 * 3600 * 24);
			
			if (diffDatesByDays > expireAfterDays) {
				for (var key in localStorage) {
					if (key.search(/^(JIRAHACK-template)(s?)(-)/) == 0) {
						localStorage.removeItem(key);
					}
				}
		
				localStorage.setItem('JIRAHACK-templates-created-on-date', new Date());
			}
		} else { // First time, store the date
			localStorage.setItem('JIRAHACK-templates-created-on-date', new Date());
		}
    };
    
    const _checkForCreateKeyShortcut = function(e) {
    	const createIssueMutationNode = document.getElementById('issue-create-modal-dropzone-container');
    	
    	if (e.key == 'c' && createIssueMutationNode == null) { // Ignore 'c' keystrokes if the Create Issue modal is open
    		_listenForCreateIssueMutations();
    	}	
    };

    const _onUpdate = function() {
		let newProjectCode;
		
		if (window.location.pathname.includes('projects/')) { // Ex: /projects/{project code}/boards/...
			let newProjectPathname = window.location.pathname.split('projects/');
			newProjectCode = (newProjectPathname[1].includes('/') ? newProjectPathname[1].split('/')[0] : newProjectPathname[1]);
		} else if (window.location.pathname.includes('browse/')) { // Ex: /browse/{project code}-1234
			newProjectCode = window.location.pathname.split('browse/')[1].split('-')[0];
		}

		// Add click event listeners across projects
		setTimeout(() => {
			document.getElementById('createGlobalItem').addEventListener('click', _listenForCreateIssueMutations);
			document.getElementById('createGlobalItemIconButton').addEventListener('click', _listenForCreateIssueMutations);
			document.addEventListener('keydown', _checkForCreateKeyShortcut);
			
			_listenForCreateIssueMutations(); // Check to see if the Create Issue modal is rendered on page load
		}, 10); // Wait for the buttons to re-render

		setTimeout(() => {
			const minimizedCreateIssueNode = document.getElementById('minimised-issue-create-dropzone-container');
			minimizedCreateIssueNode && minimizedCreateIssueNode.addEventListener('click', _listenForCreateIssueMutations);

			document.getElementById('ak-main-content').addEventListener('click', (e) => {
			    const button = e.target.closest('button');

				// Create Issue button in Epics pane has been clicked, prepare template injection			    
			    if (button && button.innerText == 'Create issue') { _listenForCreateIssueMutations(); }
			});	
		}, 100);

		// Can't determine the project code, abort
		if (newProjectCode == undefined) { return; }

		_checkTemplatesForExpiration(typeof USER_TEMPLATE_EXPIRE_AFTER_DAYS != 'undefined' ? USER_TEMPLATE_EXPIRE_AFTER_DAYS : undefined);
		if (newProjectCode != currProjectCode) { currProjectCode = newProjectCode; } // Ex: Switching projects
		_storeProjectTemplatesLocally(currProjectCode);
    };

    const _init = function() {
    	if (typeof(USER_TEMPLATE_URLS) != 'object') { return; }
		_onUpdate();
		window.addEventListener('locationchange', _onUpdate);
    };

    return ({
		init: () => { _init(); }
    });
}

