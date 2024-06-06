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
		window.dispatchEvent(new Event('locationchange'));
	});
})();

function loadScript(type, url, callback) {
	let head = document.head;
	let node;
	
	switch (type) {
		case 'text/css':
			node = document.createElement('link');
			node.type = type;
			node.href = url;
			node.rel = 'stylesheet';
			break;
		case 'text/javascript':
			node = document.createElement('script');
			node.type = type;
			node.src = url;
			node.defer = true;
			break;
	}
	
	if (typeof node !== 'undefined') {
		// Bind the event to the callback function
		// There are several events for cross browser compatibility
		node.onreadystatechange = callback;
		node.onload = callback;
	
		// Load the resource
		head.appendChild(node);
	}
}

function makeJiraHacks() {
	const JIRA_HACKS_REPO_URL = 'gh/madeofpixels/jira-hacks';
	const JIRA_HACKS_COMBINE_URL = 'https://cdn.jsdelivr.net/combine/' + JIRA_HACKS_REPO_URL + '@' + JIRA_HACKS_VERSION + '/';
	
	const JIRA_HACKS_FILES = {
		'FilterBacklogBySubTeam': ['hackFilterBacklogBySubTeam.js', 'hackFilterBacklogBySubTeam.css'],
		'CustomTemplateInjector': ['hackCustomTemplateInjector.js'],
		'DisplayFilterBadgeCounts': [],	// TBD
	};
	
	const _initJiraHacks = function(hackList) {
		hackList.forEach(
			hackName => {
				// Ensure the function exists and initialize
				typeof window['hack' + hackName] == 'function' && window['hack' + hackName]().init();	
			}
		);
	};
	
	const _loadJiraHacks = function() {
		let hackEnabledList = [];

		let hackCSSFilesToLoad = [];
		let combinedCSSHacksToLoad = JIRA_HACKS_COMBINE_URL;
		
		let hackJSFilesToLoad = [];
		let combinedJSHacksToLoad = JIRA_HACKS_COMBINE_URL;

		for (const [hackName, hackIsEnabled] of Object.entries(JIRA_HACKS)) {
			if (hackIsEnabled) {
				// Don't load the hack if it exists locally
				typeof window['hack' + hackName] !== 'function' && typeof JIRA_HACKS_FILES[hackName][0] !== 'undefined' && hackJSFilesToLoad.push(JIRA_HACKS_FILES[hackName][0]);

				typeof JIRA_HACKS_FILES[hackName][1] !== 'undefined' && hackCSSFilesToLoad.push(JIRA_HACKS_FILES[hackName][1]);
				
				hackEnabledList.push(hackName);
			}
		}
		
		if (hackCSSFilesToLoad.length > 0) {
			combinedCSSHacksToLoad += hackCSSFilesToLoad.join(',' + JIRA_HACKS_REPO_URL + '@' + JIRA_HACKS_VERSION + '/');
			loadScript('text/css', combinedCSSHacksToLoad, () => {});
		}
		
		if (hackJSFilesToLoad.length > 0) {
			combinedJSHacksToLoad += hackJSFilesToLoad.join(',' + JIRA_HACKS_REPO_URL + '@' + JIRA_HACKS_VERSION + '/');
			loadScript('text/javascript', combinedJSHacksToLoad, () => { _initJiraHacks(hackEnabledList); });
		} else {
			// All hacks are defined locally
			_initJiraHacks(hackEnabledList);
		}
	};
    
	const _init = function() {
		// Confirm we're in Jira and the user has created the JIRA_HACKS object
		if (window.location.href.includes('jira') && Object.keys(JIRA_HACKS).length > 0) {
			window.onload = _loadJiraHacks;
		}
	};

	return ({
		init: () => { _init(); }
	});
}

const jiraHacks = makeJiraHacks();
jiraHacks.init();

