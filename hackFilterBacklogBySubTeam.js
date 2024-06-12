/*===== Jira: Filter Backlog by Sub Team =====*/
function hackFilterBacklogBySubTeam() {
	// USER_SUB_TEAM_SPRINTS_TO_HIDE_BY_PROJECT format:
	// 'Project Code': { 'Key (SubTeamIdentifier)': ['SearchValue 1', 'SearchValue 2',... 'SearchValue n'] }
	//
	// Example:
	// {
	//	'ABC': {
	//		'Team A': ['Team B', 'Team C'],
	//		'Team B': ['Team A'],
	//		'Team C': ['Team A', 'Team B']
	// 	},
	// 	'XYZ': {
	// 		'Team 1': ['Team 2'],
	// 		'Team 2': ['Team 1', 'Enhancements']
	// 	}
	// }
	// 
	// In Jira project ABC, this will generate filter buttons named: Team A, Team B and Team C
	// Clicking on 'Team A' will hide any Sprints on the backlog that contain the search terms "Team B" or "Team C"

	const BOARD_MUTATION_CONFIG = {attributes: false, childList: true, subtree: false};

	let currProjectCode;
	let currFilterBtn;
	let boardMutationNode;
	let sprintsToHideBySubTeam;
	let isBoardUpdateInProgress = false;

	const _updateCSSDisplayForSprints = function(hideSprintList) {
		const sprintElts = document.querySelectorAll('div[data-testid^="software-backlog.card-list.container"]');
		
		// Reset all Sprints to appear by default
		sprintElts.forEach(
			sprintElt => { sprintElt.classList.remove('JIRAHACK-hide-elt'); }
		);
		
		if (hideSprintList.length == 0) { return; }

		sprintElts.forEach(
			sprintElt => {
				hideSprintList.forEach(
					hideSprintName => {
						// Determine if the Sprint's name includes one of the filter (hide) values
						let sprintEltHeading = sprintElt.querySelector('h2');
						let sprintFirstEltIsSpan = sprintElt.childNodes[0];
						
						// If this is a newly created Sprint (ie: it includes a <span> elt), do NOT hide it
						if (sprintEltHeading === null || sprintFirstEltIsSpan.tagName == 'SPAN') { return; }
						else if (sprintEltHeading.textContent.includes(hideSprintName)) {
							sprintElt.classList.add('JIRAHACK-hide-elt');
							return;
						}
					}
				);
			}	
		);
	};
	
	const _getFilterBtnClassName = function(filterName) {
		return 'JIRAHACK-' + filterName.replaceAll(' & ', '-').replaceAll(' ', '-');
	};
	
	const _updateCSSForFilterButton = function() {
		currFilterBtn.removeEventListener('blur', _updateCSSForFilterButton);
		currFilterBtn.classList.remove('JIRAHACK-btn-onfocus');
	};
	
	const _filterSprintView = function(e) {
		// Update the previous filter button styles
		currFilterBtn && currFilterBtn.classList.remove('JIRAHACK-btn-selected', 'JIRAHACK-btn-onfocus');
		
		// Update the selected filter button styles
		currFilterBtn = e.target;
		localStorage.setItem('JIRAHACK-subTeamFilter-' + currProjectCode, currFilterBtn.className);
		
		if (currFilterBtn.ignoreBlurEffect) {
			currFilterBtn.ignoreBlurEffect = false;
			currFilterBtn.classList.add('JIRAHACK-btn-selected');
		} else {
			currFilterBtn.classList.add('JIRAHACK-btn-selected', 'JIRAHACK-btn-onfocus');
			currFilterBtn.addEventListener('blur', _updateCSSForFilterButton);
		}
		
		_updateCSSDisplayForSprints(sprintsToHideBySubTeam[e.target.textContent] || []);
	};
	
	const _createFilterBtn = function(filterName) {
		let filterBtn = document.createElement('button');
		
		filterBtn.classList.add(_getFilterBtnClassName(filterName.replaceAll('.', '')));
		filterBtn.innerHTML = filterName;
		filterBtn.addEventListener('click', _filterSprintView);
		
		return filterBtn;
	};
	
	const _createFilterContent = function() {
		const filterBtnNames = Object.keys(sprintsToHideBySubTeam);
		
		const parent = document.createElement('div');
		parent.id = 'JIRAHACK-team-filters';
		
		parent.appendChild(_createFilterBtn('All')); // Add an unfiltered button first

		filterBtnNames.forEach(
			filterName  => {
				parent.appendChild(_createFilterBtn(filterName));
			}
		);
		
		return parent;
	};
	
	const _setFilterView = function() {
		let filterClassName = localStorage.getItem('JIRAHACK-subTeamFilter-' + currProjectCode);
		
		if (filterClassName == null) {
			filterClassName = _getFilterBtnClassName('All');
			localStorage.setItem('JIRAHACK-subTeamFilter-' + currProjectCode, filterClassName);
		}
		
		const currFilterBtn = document.querySelector('#JIRAHACK-team-filters .' + filterClassName.replaceAll('.', ''));
		currFilterBtn.ignoreBlurEffect = true;
		currFilterBtn.click();
	};
	
	const _onUpdate = function() {
		if (isBoardUpdateInProgress) { return; }
		isBoardUpdateInProgress = true;

		setTimeout(() => {
			// Clean up previous elts
			const prevFilterBySubTeamsElements = document.getElementById('JIRAHACK-team-filters');
			prevFilterBySubTeamsElements && prevFilterBySubTeamsElements.remove();
			
			currProjectCode = window.location.pathname.split('projects/')[1].split('/')[0];
		
			sprintsToHideBySubTeam = USER_SUB_TEAM_SPRINTS_TO_HIDE_BY_PROJECT[currProjectCode];
			
			if (typeof sprintsToHideBySubTeam != 'object' || Object.keys(sprintsToHideBySubTeam).length === 0) { return; }
	
			const backlogHeaderElt = document.querySelector('h1');
			const filterBySubTeamsElements = _createFilterContent();
			backlogHeaderElt.after(filterBySubTeamsElements);
			
			_setFilterView();
	
			isBoardUpdateInProgress = false;
		}, 1250); // This is not an exact science..
	};
	
	const _enableBoardObserver = function() {
		boardMutationNode = document.querySelector('div[data-testid="software-backlog.backlog-content.scrollable"]');
		boardMutationNode && boardObserver.observe(boardMutationNode, BOARD_MUTATION_CONFIG);
	};

	const _onBoardMutation = function(mutationList, boardObserver) {
		if (isBoardUpdateInProgress) { return; }
		
		_onUpdate();
	};

	const boardObserver = new MutationObserver(_onBoardMutation);

	const _onLocationChange = function() {
		if (!window.location.href.includes('backlog')) { return; }
		
		isBoardUpdateInProgress = false;
		
		const firstSprintElt = document.querySelector('div[data-testid^="software-backlog.card-list.container"]');

		// Test to see whether the Sprints have rendered. If not, wait a little longer
		if (firstSprintElt != null) {
			_enableBoardObserver();
			_onUpdate();
		} else {
			setTimeout(_onLocationChange, 100);
		}
	};
	
	const _init = function(e) {
		// If no user-defined Sprint key-value pairs are defined, exit
		if (typeof USER_SUB_TEAM_SPRINTS_TO_HIDE_BY_PROJECT == "undefined" || Object.keys(USER_SUB_TEAM_SPRINTS_TO_HIDE_BY_PROJECT).length == 0) { return; }

		_onLocationChange();
		window.addEventListener('locationchange', _onLocationChange);
	};

	return ({
		init: () => { _init(); }
	});
}
