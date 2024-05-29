/*===== Jira: Filter Backlog by Sub Team =====*/
function makeFilterBacklogBySubTeam() {
	// USER_SPRINTS_TO_HIDE_BY_SUB_TEAM format: '{Key (SubTeamIdentifier)}': ['{SearchValue 1}', '{SearchValue 2}',... '{SearchValue n}'],
	// 
	// Example:
	// {
	// 	'Team A': ['Team B', 'Team C'],
	// 	'Team B': ['Team A'], // show Team C sprints
	// 	'Team C': ['Team A', 'Team B']
	// };
	// 
	// This will match all Sprints containing the specified key(s):
	// For Key = 'Team A', SearchValues = 'Team B', 'Team C'
	// This will create a button named 'Team A' in the filter list and clicking it will hide Sprints
	// that contain the search value. For instance: 'Team B BACKLOG', 'Team B Active', 'Sprint - Team C'
	const sprintsToHideBySubTeam = (typeof USER_SPRINTS_TO_HIDE_BY_SUB_TEAM != "undefined" && Object.keys(USER_SPRINTS_TO_HIDE_BY_SUB_TEAM).length > 0) ? USER_SPRINTS_TO_HIDE_BY_SUB_TEAM : {};
	
	const filterBtnNames = Object.keys(sprintsToHideBySubTeam);
	
	let currFilterBtn;
	let isBoardUpdateInProgress = false;

	const _updateCSSDisplayForSprints = function(hideSprintList) {
		const sprintElts = document.querySelectorAll('div[data-testid^="software-backlog.card-list.container"]');
		
		// Reset all Sprints to appear by default
		sprintElts.forEach(
			sprintElt => { sprintElt.classList.remove('JIRAHACK-hide-elt'); }
		);
		
		if (hideSprintList.length == 0) { return; }
				
		hideSprintList.forEach(
			hideSprintName => {
				sprintElts.forEach(
					sprintElt => {
						// Determine if the Sprint's name includes one of the filter (hide) values
						sprintElt.querySelector('div.ahoa2g-3.dWYuvJ').textContent.includes(hideSprintName) ? sprintElt.classList.add('JIRAHACK-hide-elt') : null;
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
		localStorage.setItem('JIRAHACK-subTeamFilter', currFilterBtn.className);
		
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
		
		filterBtn.classList.add(_getFilterBtnClassName(filterName));
		filterBtn.innerHTML = filterName;
		filterBtn.addEventListener('click', _filterSprintView);
		
		return filterBtn;
	};
	
	const _createFilterContent = function() {
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
		let filterClassName = localStorage.getItem('JIRAHACK-subTeamFilter');
		
		if (filterClassName == null) {
			filterClassName = _getFilterBtnClassName('All');
			localStorage.setItem('JIRAHACK-subTeamFilter', filterClassName);
		}
		
		const currFilterBtn = document.querySelector('#JIRAHACK-team-filters .' + filterClassName);
		currFilterBtn.ignoreBlurEffect = true;
		currFilterBtn.click();
	};
	
	const _onUpdate = function() {
		let filterContentParent = document.querySelector('#JIRAHACK-team-filters');
		
		if (isBoardUpdateInProgress || filterContentParent !== null) { return; }
		isBoardUpdateInProgress = true;
		
		const backlogHeaderElt = document.querySelector('h1');
		
		const filterBySubTeamsElements = _createFilterContent();
		backlogHeaderElt.after(filterBySubTeamsElements);
		
		// Check to see if Sprints were previously filtered
		_setFilterView();

		isBoardUpdateInProgress = false;
	};

	const _onLocationChange = function() {
		if (!window.location.href.includes('backlog')) { return; }
		
		isBoardUpdateInProgress = false;
		
		const firstSprintElt = document.querySelector('div[data-testid^="software-backlog.card-list.container"]');
		
		// Test to see whether the Sprints have rendered. If not, wait a little longer
		firstSprintElt != null ? _onUpdate() : setTimeout(_onLocationChange, 100);
	};
	
	const _init = function(e) {
		// If no user-defined Sprint key-value pairs are defined (USER_SPRINTS_TO_HIDE_BY_SUB_TEAM), exit
		if (Object.keys(sprintsToHideBySubTeam).length == 0) { return; }

		_onLocationChange();
		window.addEventListener('locationchange', _onLocationChange);
	};

	return ({
		init: () => { _init(); }
	});
}
