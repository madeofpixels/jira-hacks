// USED BY: Inject Custom Template on Create Issue
// Custom templates are stored in https://api.npoint.io – you can define your own custom data source
// by following this structure for all entries: 'PROJECT_CODE': 'URL_TO_TEMPLATE';
// Example:
// const USER_TEMPLATE_URLS = {
//     Format: 'PROJECT_CODE': 'URL_TO_TEMPLATE'
//     'ABC': 'https://api.npoint.io/656bccf0972ed60b7bba', // Edit template at https://www.npoint.io/docs/656bccf0972ed60b7bba
// }

// Uncomment and add your Jira project/JSON template pairing(s):
// const USER_TEMPLATE_URLS = {
//     'PROJECT_CODE': 'URL_TO_TEMPLATE',
// }

/*===== Jira: Custom Template Injector on Create Issue =====*/
function hackCustomTemplateInjector() {
    const CREATE_ISSUE_MUTATION_CONFIG = {attributes: true, childList: true, subtree: true};

    let currProjectCode;

    const _fetchProjectTemplates = async function(projectCode, _callback = undefined) {
		const templateSource = (localStorage.getItem('JIRAHACK-templates-all-projects') != null) ? JSON.parse(localStorage.getItem('JIRAHACK-templates-all-projects')) : USER_TEMPLATE_URLS;
		const requestURL = templateSource[projectCode];
		
		if (localStorage.getItem('JIRAHACK-template-' + projectCode) !== null || requestURL == undefined) {
			// Don't re-fetch if in same project or the project code is undefined
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
				throw new Error('_fetchProjectTemplates::Invalid JSON response');
			}
			
			typeof(_callback) == 'function' && _callback(projectCode);
		} catch (e) {
			console.error('Error fetching templates: ', e);
		}
    };
    
    const _listenForCreateIssueMutations = function(e) {
		setTimeout(() => {
			const createIssueMutationNode = document.getElementById('issue-create-modal-dropzone-container');
		
			if (createIssueMutationNode != null) {
				createIssueObserver.observe(createIssueMutationNode, CREATE_ISSUE_MUTATION_CONFIG);
			}
		}, 100); // Wait for the Create Issue modal to render
    };

    const _getIssueTemplate = function() {
		const projectCodePicker = document.getElementById('issue-create.ui.modal.create-form.project-picker.project-select');
		const selectedDDProjectCode = projectCodePicker && projectCodePicker.innerText.split('(')[1].split(')')[0]; // Ex: "ABC Team (ABC)"
		
		if (selectedDDProjectCode && selectedDDProjectCode != currProjectCode) {
			const createDescriptionField = document.getElementById('ak-editor-textarea');
			createDescriptionField.innerText = 'Loading template...';
			_fetchProjectTemplates(selectedDDProjectCode, _injectIssueTemplate);
		} else {
			_injectIssueTemplate(currProjectCode);
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
		setTimeout(() => { document.querySelector('div[data-testid="issue-create.ui.modal.modal-wrapper.modal--scrollable"]').scrollTop = 0; }, 10);
    };
    
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
    };

    const createIssueObserver = new MutationObserver(_onCreateIssueMutation);
    
    const _clearTemplatesIfExpired = function () {
		// Force expiry of stored templates every 7 days, to ensure "permanently opened" tabs receive version updates
		if (localStorage.getItem('JIRAHACK-templates-created-on-date') !== null) {
			const templatesCreatedOnDate = new Date(localStorage.getItem('JIRAHACK-templates-created-on-date'));
			const currDate = new Date();
			const diffDatesByTime = currDate.getTime() - templatesCreatedOnDate.getTime();
			const diffDatesByDays = diffDatesByTime / (1000 * 3600 * 24);
			
			if (diffDatesByDays > 7) { // Invalidate stored templates that are older than 7 days
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

    const _getProjectTemplateUrls = async function (_callback = undefined) {
		_clearTemplatesIfExpired();
		
		if (localStorage.getItem('JIRAHACK-templates-all-projects') != null || typeof(USER_TEMPLATE_URLS) != 'undefined') {
			// Use the stored templates
			typeof(_callback) == 'function' && _callback();
		} else if (typeof(REMOTE_PROJECT_TEMPLATES_URL) != 'undefined' && localStorage.getItem('JIRAHACK-templates-all-projects') == null) {
			try {
				const request = new Request(REMOTE_PROJECT_TEMPLATES_URL);
				const response = await fetch(request);
				const jsonResponse = await response.json();
				
				if (typeof jsonResponse == 'object') {
					localStorage.setItem('JIRAHACK-templates-all-projects', JSON.stringify(jsonResponse));
				} else {
					throw new Error('getProjectTemplateUrls::Invalid JSON response');
				}
			
				typeof(_callback) == 'function' && _callback();
			} catch (e) {
				console.error('Error fetching templates: ', e);
			}
		}
    };

    const _onUpdate = function() {
		let newProjectPathname = window.location.pathname.split('projects/');
		let newProjectCode = newProjectPathname.length == 1 ? undefined : newProjectPathname[1].split('/')[0];

		// Click event listeners are removed (ie: switching to the same project), re-add
		setTimeout(() => {
			document.getElementById('createGlobalItem').addEventListener('click', _listenForCreateIssueMutations);
			document.getElementById('createGlobalItemIconButton').addEventListener('click', _listenForCreateIssueMutations);
		}, 10); // Wait for the buttons to re-render

		if (newProjectCode == undefined) { return; }
		
		_getProjectTemplateUrls(() => {
			if (newProjectCode != currProjectCode) { // Switching projects
				currProjectCode = newProjectCode;
				_fetchProjectTemplates(currProjectCode);
			}
		});
    };

    const _init = function() {
		_onUpdate();
		window.addEventListener('locationchange', _onUpdate);
    }

    return ({
   	 init: () => { _init(); }
    });
}
