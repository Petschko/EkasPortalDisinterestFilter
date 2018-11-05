// ==UserScript==
// @name         Eka's Portal Disinterest Filter
// @namespace    http://zcxv.com/
// @description  Filter out artists you don't like on Eka's Portal
// @author       Kiri Nakatomi aka WHTB
// @version      1.3.1
// @encoding     utf-8
// @licence      https://raw.githubusercontent.com/Petschko/EkasPortalDisinterestFilter/master/LICENSE
// @homepage     https://github.com/Petschko/EkasPortalDisinterestFilter
// @supportURL   https://github.com/Petschko/EkasPortalDisinterestFilter/issues
// @contactURL   https://github.com/Petschko/EkasPortalDisinterestFilter#contact
// @updateURL    https://github.com/Petschko/EkasPortalDisinterestFilter/raw/master/Ekas_Portal_Disinterest_Filter.user.js
// @downloadURL  https://github.com/Petschko/EkasPortalDisinterestFilter/raw/master/Ekas_Portal_Disinterest_Filter.user.js
// @match        http://aryion.com/*
// @match        https://aryion.com/*
// @grant        none
// ==/UserScript==

(function() {
	'use strict';

	/**
	 * Option to skip confirmation dialogs when blocking a user
	 *
	 * @type {boolean} - true if the confirmation is presented, otherwise false
	 */
	var skipConfirmationDialog = false;

	/**
	 * Option to disable MouseOver-Buttons and use all-time shown buttons
	 *
	 * @type {boolean} - true if use MouseOver-Buttons else false
	 */
	var useMouseOverButtons = true;

	/**
	 * Contains if debug is enabled
	 *
	 * @type {boolean} - true if debug is enabled else false
	 */
	var debug = false;

	/**
	 * Contains all users we have blocked
	 *
	 * @type {Array} - All blocked Users
	 */
	var badUserList = [];

	/**
	 * Keep track of which users we've actually hidden, so we can display unblock buttons for them.
	 *
	 * @type {Array} - Currently hidden Users
	 */
	var currentUserHiddenList = [];

	/**
	 * DON'T CHANGE! Contains the value if you want to see blocked content (Changes via button action)
	 *
	 * @type {boolean} - true shows blocked content
	 */
	var showBlockedContent = false;

	/**
	 * DON'T CHANGE! This is a system value, which saves if the user CSS was already removed, to avoid duplicate removing from head styles
	 *
	 * @type {boolean} - true when user css was removed else false
	 */
	var removedUserCss = false;

	/**
	 * Contains all Users where the User-Style (Custom Style) is blocked and reset to Eka's default
	 *
	 * @type {Array} - All Users where the Style is blocked by default
	 */
	var userStyleBlockList = [];

	/**
	 * Resets the current Block User List
	 */
	function resetCurrentBlockUser() {
		currentUserHiddenList = [];
	}

	/**
	 * Save the bad user list to local storage
	 */
	function saveData() {
		localStorage.setItem('whtb-blocklist', badUserList.join());
		localStorage.setItem('tigercloud-ekas-desinterest-styleBlockList', userStyleBlockList.join());
	}

	/**
	 * Load all settings from the local storage
	 */
	function loadData() {
		var loadedList = localStorage.getItem('whtb-blocklist');
		var loadedStylesList = localStorage.getItem('tigercloud-ekas-desinterest-styleBlockList');
		logAdd('Loaded Ekas-Desinterest Block-Lists');

		// Handle if blocklist exists
		if(loadedList !== null) {
			badUserList = loadedList.split(',');

			// Show Loaded User in Log
			for(var i = 0; i < badUserList.length; i++)
				logAdd('Loaded bad user: ' + badUserList[i]);
		}

		// Handle
		if(loadedStylesList !== null) {
			userStyleBlockList = loadedStylesList.split(',');

			for(var n = 0; n < userStyleBlockList.length; n++)
				logAdd('Loaded blocked User-Style: ' + userStyleBlockList[n]);
		}
	}

	/**
	 * Block a user-style by name
	 *
	 * @param {string} username - Username for the style to block
	 */
	function blockUserStyle(username) {
		// Check if User is already in list
		if(userStyleBlockList.indexOf(username) !== -1) {
			refreshPage(); // Reload to remove wrong buttons that may cause this case
			return;
		}

		// Add User and save
		userStyleBlockList.push(username);
		refreshPage();
		saveData();
	}

	/**
	 * Unblock a user-style by name
	 *
	 * @param {string} username - Username for the style to unblock
	 */
	function unblockUserStyle(username) {
		var index = userStyleBlockList.indexOf(username);

		// Check if User is in list
		if(index === -1) {
			refreshPage(); // Reload to remove wrong buttons that may cause this case
			return;
		}

		userStyleBlockList.splice(index, 1);
		refreshPage();
		saveData();

		// Inform the user
		if(confirm('Removed the user-style of ' + username + ' from the block-list. Do you want to reload the Page to see it again?'))
			location.reload();
	}

	/**
	 * Block a user by name
	 *
	 * @param {string} username - Username to block
	 */
	function blockUser(username) {
		// Check if User is already in list
		if(badUserList.indexOf(username) !== -1) {
			refreshPage(); // Reload to remove wrong buttons that may cause this case
			return;
		}

		// Add User and save
		badUserList.push(username);
		refreshPage();
		saveData();
	}

	/**
	 * Unblock a user by name
	 *
	 * @param {string} username - Username to unblock
	 */
	function unblockUser(username) {
		var index = badUserList.indexOf(username);

		// Check if User is in list
		if(index === -1) {
			refreshPage(); // Reload to remove wrong buttons that may cause this case
			return;
		}

		badUserList.splice(index, 1);
		refreshPage();
		saveData();
	}

	/**
	 * Detect if the haystack starts with needle this function is case insensitive
	 *
	 * @param {string} haystack - String to check
	 * @param {string} needle - Start string on haystack
	 * @returns {boolean} - true if haystack starts with needle
	 */
	function stringStartWith(haystack, needle) {
		return haystack.toLowerCase().indexOf(needle.toLowerCase()) === 0;
	}

	/**
	 * Detects if the current page is a User-Profile and returns the username
	 *
	 * @returns {null|string} - Username of the current UserPage or null if it's not a UserPage
	 */
	function getUserPageUsername() {
		var currentPath = '/' + window.location.href.split(/^(ftp|https?):\/\/aryion\.com\/(.+)$/)[2];
		var username = null;
		var searchG4RegEx = new RegExp(/^\/g4\/(user|gallery|favorites)\/.+$/);
		var searchOtherRegEx = new RegExp(/^\/g4\/(userpage\.|latest\.php\?name=|watch\.php\?id=).+$/);
		var searchViewRegEx = new RegExp(/^\/g4\/view\/.+$/);

		// Cut of the anchor from the URL
		currentPath = currentPath.split('#')[0];

		// Get username from different patterns
		if(currentPath.search(searchG4RegEx) !== -1) {
			username = currentPath.split(/^\/g4\/(user|gallery|favorites)\/(.+)(\/)?(.+)?$/)[2];

			// Remove sub directories if exists
			username = username.split('/')[0];
		} else if(currentPath.search(searchOtherRegEx) !== -1) {
			username = currentPath.split(/^\/g4\/(userpage\.commission\.php\?id=|latest\.php\?name=|watch\.php\?id=)(.+)$/)[2];
		} else if(currentPath.search(searchViewRegEx) !== -1) {
			var gBoxElementList = document.getElementsByClassName('g-box');

			if(gBoxElementList.length > 2) {
				// Handle Drawings/Stories
				username = gBoxElementList[0].getElementsByTagName('a')[1].innerHTML;
			} else if(gBoxElementList.length > 0) {
				// Handle Gallery-Directories
				username = gBoxElementList[1].getElementsByTagName('a')[1].innerHTML;
			}
		}

		return username;
	}

	/**
	 * Displays a message on the console if debug is enabled
	 *
	 * @param {string} message - Message to add
	 */
	function logAdd(message) {
		if(debug)
			console.log(message);
	}

	/**
	 * Imports Data from a JSON-String
	 *
	 * @param {Object|String} importJSON - Imported JSON-Object/String
	 */
	function importData(importJSON) {
		var newLists = {};
		var userList = [];
		var styleUserList = [];

		try {
			newLists = JSON.parse(importJSON);
		} catch(e) {
			alert('Error: Your browser doesn\'t support JSON-Methods...');

			return;
		}

		// Check if its an old import format
		if(Array.isArray(newLists))
			userList = newLists;
		else {
			userList = newLists.blocked_user;
			styleUserList = newLists.blocked_style_user;
		}

		// Warn user on specific behaviours
		var importUser = true;
		var importUserStyle = true;
		if(userList.length < 1)
			importUser = confirm('WARNING: The imported User-Block-List seems to be empty... Do you want import it anyway?');
		if(styleUserList.length < 1)
			importUserStyle = confirm('WARNING: The imported Style-Block-List seems to be empty... Do you want import it anyway?');
		if(badUserList.length > 0)
			importUser = confirm('WARNING: The imported Block-List will replace your current one! Please note, that it does not add the Users, it REPLACES them! Do you want go on?');
		if(userStyleBlockList > 0)
			importUserStyle = confirm('WARNING: The imported Style-Block-List will replace your current one! Please note, that it does not add the Users, it REPLACES them! Do you want go on?');

		// Save new List
		if(importUser)
			badUserList = userList;
		if(importUserStyle)
			userStyleBlockList = styleUserList;
		saveData();

		alert(
			'Successfully imported ' + ((importUser) ? userList.length : '0') +
			' Blocked-Users & ' + ((importUserStyle) ? styleUserList.length : '0') + ' Blocked-User-Styles from File'
		);
	}

	/**
	 * Exports the Blocked-User-List to an JSON-File
	 */
	function exportData() {
		var jsonExport = '';

		try {
			jsonExport = JSON.stringify({'blocked_user': badUserList, 'blocked_style_user': userStyleBlockList});
		} catch(e) {
			alert('Error: Your browser doesn\'t support JSON-Methods...');

			return;
		}

		var fileBlob = new Blob([jsonExport], {type: 'text/plain'});
		var blobUrl = window.URL.createObjectURL(fileBlob);

		// Download
		var a = document.createElement('a');
		a.style.display = 'none';
		a.href = blobUrl;
		a.download = 'EkasDisinterestFilterExport.json';
		a.innerHTML = 'Export-Download';

		/**
		 * Removes this Element from HTML-Document
		 *
		 * @param {Object} ev - Event-Object
		 */
		a.onclick = function(ev) {
			document.body.removeChild(ev.target);
		};

		document.body.appendChild(a);
		a.click();

		// Clear Memory
		window.URL.revokeObjectURL(blobUrl);
		fileBlob = null;
	}

	/**
	 * Creates a UnBlock button with assigned OnClick function
	 *
	 * @param {string} username - Username of the UnBlock-User for this Button
	 * @returns {HTMLElement} - UnBlock-Button
	 */
	function createUnBlockButton(username) {
		var restoreButton = document.createElement('button');
		restoreButton.type = 'button';
		restoreButton.innerHTML = username;

		/**
		 * Adds the unblockUser function to this Button
		 */
		restoreButton.onclick = function() {
			if(skipConfirmationDialog || confirm('Do you really want unblock ' + username + '?'))
				unblockUser(username);
		};

		return restoreButton;
	}

	/**
	 * Creates a Block button with assigned OnClick function
	 *
	 * @param {string} username - Username of the Block-User for this Button
	 * @param {boolean} displayName - Display the Name on the button? Default is true
	 * @returns {HTMLElement} - BlockButton
	 */
	function createBlockButton(username, displayName) {
		var hideButton = document.createElement('button');
		hideButton.type = 'button';
		displayName = (typeof displayName === 'undefined') ? true : displayName;

		if(displayName)
			hideButton.innerHTML = 'Block ' + username;
		else
			hideButton.innerHTML = 'Block';

		hideButton.className = 'whtb-block-button';

		/**
		 * Adds the blockUser function to this Button
		 */
		hideButton.onclick = function() {
			if(skipConfirmationDialog || confirm('Are you sure to block ' + username + '?'))
				blockUser(username);
		};

		return hideButton;
	}

	/**
	 * Creates a button to show/hide the hideElement
	 *
	 * @param {HTMLElement} hideElement - Element to Hide/Show
	 * @returns {HTMLElement} - Show/Hide Button
	 */
	function createShowHideButton(hideElement) {
		var showHideButton = document.createElement('button');
		showHideButton.type = 'button';

		// Initial text depends on status of the element
		if(hideElement.style.display === 'none')
			showHideButton.innerHTML = 'Show';
		else
			showHideButton.innerHTML = 'Hide';

		/**
		 * Hide/Shows the Element also changes the Text on the Button
		 */
		showHideButton.onclick = function() {
			if(hideElement.style.display === 'none') {
				hideElement.style.display = '';
				this.innerHTML = 'Hide';
			} else {
				hideElement.style.display = 'none';
				this.innerHTML = 'Show';
			}
		};

		return showHideButton;
	}

	/**
	 * Creates a button that allow you temporary show blocked content
	 *
	 * @returns {HTMLElement} - Temp show all Button
	 */
	function createShowContentButton() {
		var button = document.createElement('button');
		button.type = 'button';
		button.className = 'whtb-button-reshow-blocked-content';

		// Initial text depends on the status of showBlockedContent
		if(showBlockedContent)
			button.innerHTML = 'Hide blocked content';
		else
			button.innerHTML = 'Temporary re-display blocked content';

		/**
		 * Switches the option if blocked content will be shown or not
		 */
		button.onclick = function() {
			if(showBlockedContent) {
				showBlockedContent = false;
				this.innerHTML = 'Temporary re-display blocked content';
			} else {
				showBlockedContent = true;
				this.innerHTML = 'Hide blocked content';
			}

			// Refresh the page to update the content
			refreshPage();
		};

		return button;
	}

	/**
	 * Creates an Export-Button
	 *
	 * @returns {HTMLElement} - Export Button
	 */
	function createExportButton() {
		var button = document.createElement('button');
		button.type = 'button';
		button.className = 'whtb-button-export';
		button.innerHTML = 'Export Blocked-User List';

		/**
		 * Downloads a JSON-File with all currently blocked users
		 */
		button.onclick = function() {
			exportData();
		};

		return button;
	}

	/**
	 * Creates an Import-Button
	 *
	 * @returns {HTMLElement} - Import Button
	 */
	function createImportButton() {
		var button = document.createElement('button');
		button.type = 'button';
		button.className = 'whtb-button-import';
		button.innerHTML = 'Import Blocked-User List';

		/**
		 * Downloads a JSON-File with all currently blocked users
		 */
		button.onclick = function() {
			var inputFile = document.createElement('input');
			inputFile.style.display = 'none';
			inputFile.type = 'file';
			inputFile.accept = 'text/*';
			inputFile.click();
			/**
			 * Process the Files
			 */
			inputFile.onchange = function() {
				if(inputFile.files.length < 1)
					return;

				var reader = new FileReader();
				/**
				 * Reads the File and import its Content
				 */
				reader.addEventListener('load', function() {
					importData(this.result);

					// Refresh the Page and remove this element
					refreshPage();
					inputFile.remove();
				}, false);

				reader.readAsText(inputFile.files[0]);
			};
		};

		return button;
	}

	/**
	 * Check if a unlock Button-container is available if not create it
	 *
	 * @param {string} className - Class Name of the unlock Button-Container
	 * @param {NodeList|Element} insertBefore - The element where to place the Button-Container(before element)
	 * @param {string} text - Text to describe the Content
	 * @returns {Node} - The unblock Button-Container
	 */
	function unlockButtonContainer(className, insertBefore, text) {
		var unblockButtonBox = document.getElementsByClassName(className);

		if(unblockButtonBox.length === 0) {
			var newUnblockButtonBox = document.createElement('div');
			var unblockButtonArea = document.createElement('div');

			unblockButtonArea.style.display = 'none';
			newUnblockButtonBox.className = className + ' g-box';
			newUnblockButtonBox.innerHTML = text;
			newUnblockButtonBox.style.padding = '2px 4px';
			newUnblockButtonBox.style.margin = '3px 0';
			newUnblockButtonBox.appendChild(createShowHideButton(unblockButtonArea));
			newUnblockButtonBox.appendChild(unblockButtonArea);
			insertBefore.insertBefore(newUnblockButtonBox, insertBefore.firstChild);

			return unblockButtonArea;
		}

		return unblockButtonBox[0].getElementsByTagName('div')[0];
	}

	/**
	 * Creates UnBlock-Buttons from User Array
	 *
	 * @param {Array} userArray - Array with User Names
	 * @param {HTMLElement|Node} addToEl - Element where the Buttons go as child
	 */
	function createUnblockButtonListFromArray(userArray, addToEl) {
		// Clear Element first to avoid double buttons
		addToEl.innerHTML = '';

		// Sort by ABC
		userArray.sort();

		for(var i = 0; i < userArray.length; i++) {
			if(userArray[i]) { // Handle empty spots in some arrays.
				var restoreButton = createUnBlockButton(userArray[i]);
				addToEl.appendChild(restoreButton);
			}
		}
	}

	/**
	 * Remove all existing Buttons with the specified class name
	 *
	 * @param {string} className - Class Name of the Button(s)
	 */
	function removeExistingButtons(className) {
		var existingButtons = document.getElementsByClassName(className);

		while(existingButtons.length > 0)
			existingButtons[0].parentNode.removeChild(existingButtons[0]);
	}

	/**
	 * Hide blocked User-Content and add a block button to non blocked User-Content
	 *
	 * @param {Document|HTMLElement|Node} element - Content-Element
	 * @param {boolean} mouseOverButtons - Use mouse over buttons
	 */
	function handleItem(element, mouseOverButtons) {
		var userLink = element.getElementsByClassName('user-link');

		if(userLink.length === 0)
			return;

		// Get UserLink and Username
		userLink = userLink[0];
		var username = userLink.innerHTML;

		// Hide if user is in list
		if(badUserList.indexOf(username) !== -1) {
			if(showBlockedContent) {
				element.style.display = '';
				element.style.backgroundColor = 'rgba(170, 0, 0, 0.13)';
				element.style.border = '4px solid #FF0000';
			} else
				element.style.display = 'none';

			// Add to current block list if not in there
			if(currentUserHiddenList.indexOf(username) === -1)
				currentUserHiddenList.push(username);
		} else { // Show Block-Button
			var hideButton;
			element.style.display = '';
			// Remove if there is some left from temp shown content
			element.style.backgroundColor = '';
			element.style.border = '';

			// Add Button
			if(mouseOverButtons) {
				hideButton = createBlockButton(username, false);
				hideButton.style.display = 'none';
				userLink.parentElement.insertBefore(hideButton, userLink.nextSibling);

				/**
				 * Makes Block-Button visible
				 */
				element.onmouseover = function() {
					var blockButton = this.getElementsByClassName('whtb-block-button')[0];
					blockButton.style.display = 'inline-block';
				};

				/**
				 * Makes Block-Button invisible if Mouse go out
				 */
				element.onmouseout = function() {
					var blockButton = this.getElementsByClassName('whtb-block-button')[0];
					blockButton.style.display = 'none';
				}
			} else {
				hideButton = createBlockButton(username, true);

				// Stick this right next to the username.
				userLink.parentElement.insertBefore(hideButton, userLink.nextSibling);
			}
		}
	}

	/**
	 * Removes the last Style-Element in HTML-Head
	 */
	function removeUserCss() {
		// don't remove more than one time the user css
		if(removedUserCss)
			return;

		var htmlHead = document.getElementsByTagName('head')[0];
		var headStyles = htmlHead.getElementsByTagName('style');

		// Remove only the last element
		headStyles[headStyles.length - 1].parentNode.removeChild(headStyles[headStyles.length - 1]);

		removedUserCss = true;
	}

	/**
	 * Check if the given user is blocked and remove the CSS from the Userpage
	 *
	 * @param {string} username - Username
	 */
	function blockStyle(username) {
		// Check if user is blocked
		if(userStyleBlockList.indexOf(username) === -1)
			return;

		removeUserCss();
	}

	/**
	 * Creates the Style-Block Buttons or unblock buttons
	 *
	 * @param {string} username - Username of the Current Page
	 */
	function createStyleBlockButtons(username) {
		var userPageTabsEl = document.getElementById('userpagetabs');
		var tabId = 'tigercloud-style-block-tab';
		var isStyleBlocked = (userStyleBlockList.indexOf(username) !== -1);
		var userTab = document.getElementById(tabId);

		if(! userPageTabsEl)
			return;

		var tabList = userPageTabsEl.getElementsByTagName('ul');

		if(! tabList || tabList.length < 1)
			return;

		tabList = tabList[0];

		// Create the functions
		var blockFunction = function() {
			if(skipConfirmationDialog || confirm('Are you sure to block the Style on ' + username + '\'s Userpage?'))
				blockUserStyle(username);
		};
		var unBlockFunction = function() {
			if(skipConfirmationDialog || confirm('Are you sure to unblock the Style on ' + username + '\'s Userpage?'))
				unblockUserStyle(username);
		};

		// Create the Tab or update it if exists
		if(userTab) {
			userTab.innerHTML = ((isStyleBlocked) ? 'Unblock' : 'Block') + ' this Style';
			userTab.onclick = (isStyleBlocked) ? unBlockFunction : blockFunction;
		} else {
			var blockTab = document.createElement('li');
			blockTab.id = tabId;
			blockTab.className = 'ui-state-default ui-corner-top';
			blockTab.style.padding = '0 12px';
			blockTab.style.cursor = 'pointer';
			blockTab.style.borderColor = '#C00';
			blockTab.style.color = '#A00';
			blockTab.innerHTML = ((isStyleBlocked) ? 'Unblock' : 'Block') + ' this Style';
			blockTab.onclick = (isStyleBlocked) ? unBlockFunction : blockFunction;

			tabList.appendChild(blockTab);
		}
	}

	/**
	 * Adds the user Param to the page-links, if user-tag-search is in use
	 */
	function fixUserTagUrlPageLinks() {
		var currentUrl = document.location.href;
		var isUserTagRegEx = new RegExp(/^(.+)\/g4\/tags\.php\?(.+)?user=(.+)$/);

		// Exit function if url scheme does not match
		if(currentUrl.search(isUserTagRegEx) === -1)
			return;

		var user = new URL(document.location.href).searchParams.get('user');

		if(! user)
			return;

		var pageContainerList = document.getElementsByClassName('pagenav');

		for(var i = 0; pageContainerList.length > i; i++) {
			var linksElList = pageContainerList[i].getElementsByTagName('a');

			for(var n = 0; linksElList.length > n; n++) {
				// Avoid duplicate addition
				if(linksElList[n].href.search(isUserTagRegEx) === -1)
					linksElList[n].href = linksElList[n].href + '&user=' + encodeURI(user);
			}
		}
	}

	/**
	 * Refresh OUR data on the page. (Doesn't cause an actual page request)
	 */
	function refreshPage() {
		logAdd('Refresh Page...');
		resetCurrentBlockUser();

		// Check the function we need to build or stuff in use the <title> content to check
		if(stringStartWith(document.title, 'g4 :: Latest Updates'))
			refreshSiteByParam('g-box-contents', 0, 'detail-item', false);

		if(stringStartWith(document.title, 'g4 :: Messages'))
			refreshSiteByParam('g-box-contents', 0, 'gallery-item', true);

		if(stringStartWith(document.title, 'g4 :: Tagged')) {
			refreshSiteByParam('gallery-items', 0, 'gallery-item', true);
			fixUserTagUrlPageLinks();
		}

		if(stringStartWith(document.title, 'g4 :: Search Results'))
			refreshSiteByParam('g-box-contents', 1, 'gallery-item', true);

		var username = getUserPageUsername();
		if(username) {
			blockStyle(username);
			createStyleBlockButtons(username);
		}
	}

	/**
	 * Refreshes the page by using params of specific elements
	 *
	 * @param {string} mainContainerClassName - Class name of the Main-Container(s)
	 * @param {int} targetContainer - Target Container of the class (starts with 0) the first (0) of them is usually the right one
	 * @param {string} itemClassName - Class name of Content-Elements
	 * @param {boolean} allowMouseOver - Allow use of MouseOver-Buttons here
	 */
	function refreshSiteByParam(mainContainerClassName, targetContainer, itemClassName, allowMouseOver) {
		// Get the MainContainer
		var mainContainer = document.getElementsByClassName(mainContainerClassName);

		// Check if the class exists
		if(mainContainer.length < targetContainer)
			return;

		// Use the first occur of the class there more of these containers but the first one is the correct container
		mainContainer = mainContainer[targetContainer];

		// Create or find the existing unblock button box, then clear it out so we can rebuild it
		var unblockButtonBox = unlockButtonContainer('whtb-unblock-box', mainContainer, 'Unblock User (On this Page):');
		var globalUnblockButtonBox = unlockButtonContainer('whtb-global-unblock-box', mainContainer, 'Unblock User (Global List):');
		// Add Buttons to global List
		createUnblockButtonListFromArray(badUserList, globalUnblockButtonBox);

		// Clear out existing block buttons from the last iteration
		removeExistingButtons('whtb-block-button');

		// Get all items
		var items = mainContainer.getElementsByClassName(itemClassName);

		// Generate Block buttons and hide blocked user
		for(var i = 0; i < items.length; i++)
			handleItem(items[i], ((allowMouseOver) ? useMouseOverButtons : false));

		// Generate the "Unblock button" list at the top. just for user on this page
		createUnblockButtonListFromArray(currentUserHiddenList, unblockButtonBox);

		// Add all main buttons to the Main Container
		if(mainContainer.getElementsByClassName('whtb-button-reshow-blocked-content').length < 1) {
			mainContainer.insertBefore(createImportButton(), mainContainer.firstChild);
			mainContainer.insertBefore(createExportButton(), mainContainer.firstChild);
			mainContainer.insertBefore(createShowContentButton(), mainContainer.firstChild);
		}
	}

	/**
	 * Creates optional event listener on a page for ajax load
	 */
	function createEventListener() {
		if(stringStartWith(document.title, 'g4 :: Messages')) {
			var elements = document.getElementsByClassName('msg-loader');

			for(var i = 0; i < elements.length; i++) {
				/**
				 * Adds a refresh function if clicked on show more
				 */
				elements[i].onclick = function() {
					setTimeout(function() {
						refreshPage();
					}, 2000);
				}
			}
		}
	}

	// ------------------------------------------------

	// Loads settings
	loadData();
	// Now just do an initial refresh to show our optional stuff
	refreshPage();
	// Check if we need to add optional event listeners - but only 1 time
	createEventListener();

})();
