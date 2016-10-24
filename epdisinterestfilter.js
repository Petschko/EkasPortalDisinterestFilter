// ==UserScript==
// @name         Eka's Portal Disinterest Filter
// @namespace    http://zcxv.com/
// @version      0.6
// @description  Filter out artists you don't like on Eka's Portal.
// @author       Kiri Nakatomi aka WHTB
// @match        http://aryion.com/g4/*
// @match        https://aryion.com/g4/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /**
     * Option to skip confirmation dialogs when blocking a user.
     *
     * @type {boolean} - true if the confirmation is presented, otherwise false.
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
     * Resets the current Block User List
     */
    function resetCurrentBlockUser() {
        currentUserHiddenList = [];
    }

    /**
     * Save the bad user list to local storage.
     */
    function saveData()
    {
        localStorage.setItem('whtb-blocklist', badUserList.join());
    }

    /**
     * Load the bad user list from local storage.
     */
    function loadData()
    {
        var loadedList = localStorage.getItem('whtb-blocklist');
        logAdd('Load Block-List');

        // Handle if list doesn't exists
        if(loadedList === null)
            return;

        badUserList = loadedList.split(',');

        // Show Loaded User in Log
        for(var i = 0; i < badUserList.length; i++)
            logAdd('Loaded bad user: ' + badUserList[i]);
    }

    /**
     * Block a user by name.
     *
     * @param {string} username - Username to block
     */
    function blockUser(username)
    {
        // Check if User is already in list
        if(badUserList.indexOf(username) != -1) {
            refreshPage(); // Reload to remove wrong buttons that may cause this case
            return;
        }

        // Add User and save
        badUserList.push(username);
        refreshPage();
        saveData();
    }

    /**
     * Unblock a user by name.
     *
     * @param {string} username - Username to unblock
     */
    function unblockUser(username)
    {
        var index = badUserList.indexOf(username);

        // Check if User is in list
        if(index == -1) {
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
    function stringStartWith(haystack, needle)
    {
        return haystack.toLowerCase().indexOf(needle.toLowerCase()) === 0;
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
     * Assign CSS-Styles, so that the Element looks like a button
     *
     * @param {Element} element - Element where to add CSS
     */
    function assignButtonCSS(element) {
        element.style.color = '#000000';
        element.style.border = '1px solid #2d37ff';
        element.style.backgroundColor = '#FFFFFF';
        element.style.borderRadius = '4px';
        element.style.display = 'inline-block';
        element.style.padding = '2px 4px';
        element.style.background = 'linear-gradient(#E0E0E0, #B0B0B0)';
        element.style.cursor = 'pointer';
        element.style.margin = '3px';
        // todo make better style
    }

    /**
     * Creates a UnBlock button with assigned OnClick function
     *
     * @param {string} username - Username of the UnBlock-User for this Button
     * @returns {Element} - UnBlock-Button
     */
    function createUnBlockButton(username)
    {
        var restoreButton = document.createElement('span');
        assignButtonCSS(restoreButton);
        restoreButton.innerHTML = username;

        /**
         * Adds the unblockUser function to this Button
         */
        restoreButton.onclick = function()
        {
            if(skipConfirmationDialog ||
               confirm('Do you really want unblock ' + username + '?')) {
                unblockUser(username);
            }
        };

        return restoreButton;
    }

    /**
     * Creates a Block button with assigned OnClick function
     *
     * @param {string} username - Username of the Block-User for this Button
     * @param {boolean} displayName - Display the Name on the button? Default is true
     * @returns {Element} - BlockButton
     */
    function createBlockButton(username, displayName)
    {
        var hideButton = document.createElement('span');
        displayName = (typeof displayName === 'undefined') ? true : displayName;

        if(displayName)
            hideButton.innerHTML = 'Block ' + username;
        else
            hideButton.innerHTML = 'Block';

        assignButtonCSS(hideButton);
        hideButton.className = 'whtb-block-button';

        /**
         * Adds the blockUser function to this Button
         */
        hideButton.onclick = function()
        {
            if(skipConfirmationDialog ||
               confirm('Are you sure to block ' + username + '?')) {
                blockUser(username);
            }
        };

        return hideButton;
    }

    /**
     * Creates a button to show/hide the hideElement
     *
     * @param {Element} hideElement - Element to Hide/Show
     * @returns {Element} - Show/Hide Button
     */
    function createShowHideButton(hideElement)
    {
        var showHideButton = document.createElement('span');
        assignButtonCSS(showHideButton);

        // Initial text depends on status of the element
        if(hideElement.style.display == 'none')
            showHideButton.innerHTML = 'Show';
        else
            showHideButton.innerHTML = 'Hide';

        /**
         * Hide/Shows the Element also changes the Text on the Button
         */
        showHideButton.onclick = function()
        {
            if(hideElement.style.display == 'none') {
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
     * @returns {Element} - Temp show all Button
     */
    function createShowContentButton()
    {
        var button = document.createElement('span');
        assignButtonCSS(button);
        button.className = 'whtb-button-reshow-blocked-content';

        // Initial text depends on the status of showBlockedContent
        if(showBlockedContent)
            button.innerHTML = 'Hide blocked content';
        else
            button.innerHTML = 'Temporary re-display blocked content';

        /**
         * Switches the option if blocked content will be shown or not
         */
        button.onclick = function()
        {
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
     * Check if a unlock Button-container is available if not create it
     *
     * @param {string} className - Class Name of the unlock Button-Container
     * @param {Element} insertBefore - The element where to place the Button-Container(before element)
     * @param {string} text - Text to describe the Content
     * @returns {Element} - The unlock Button-Container
     */
    function unlockButtonContainer(className, insertBefore, text)
    {
        var unblockButtonBox = document.getElementsByClassName(className);

        if(unblockButtonBox.length == 0) {
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
     * @param {Element} addToEl - Element where the Buttons go as child
     */
    function createUnblockButtonListFromArray(userArray, addToEl)
    {
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
    function removeExistingButtons(className)
    {
        var existingButtons = document.getElementsByClassName(className);

        while(existingButtons.length > 0)
            existingButtons[0].parentNode.removeChild(existingButtons[0]);
    }

    /**
     * Hide blocked User-Content and add a block button to non blocked User-Content
     *
     * @param {Document|Element} element - Content-Element
     * @param {boolean} mouseOverButtons - Use mouse over buttons
     */
    function handleItem(element, mouseOverButtons)
    {
        var userLink = element.getElementsByClassName('user-link');

        if(userLink.length == 0)
            return;

        // Get UserLink and Username
        userLink = userLink[0];
        var username = userLink.innerHTML;

        // Hide if user is in list
        if(badUserList.indexOf(username) != -1) {
            if(showBlockedContent) {
                element.style.display = '';
                element.style.backgroundColor = '#AA0000';
                element.style.border = '4px solid #000000';
            } else
                element.style.display = 'none';

            // Add to current block list if not in there
            if(currentUserHiddenList.indexOf(username) == -1)
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
     * Refresh OUR data on the page. (Doesn't cause an actual page request.)
     */
    function refreshPage()
    {
        logAdd('Refresh Page...');
        resetCurrentBlockUser();

        // Check the function we need to build or stuff in use the <title> content to check
        if(stringStartWith(document.title, 'g4 :: Latest Updates'))
            refreshSiteByParam('g-box-contents', 0, 'detail-item', false);

        if(stringStartWith(document.title, 'g4 :: Messages'))
            refreshSiteByParam('g-box-contents', 0, 'gallery-item', true);

        if(stringStartWith(document.title, 'g4 :: Tagged'))
            refreshSiteByParam('gallery-items', 0, 'gallery-item', true);

        if(stringStartWith(document.title, 'g4 :: Search Results'))
            refreshSiteByParam('g-box-contents', 1, 'gallery-item', true);
    }

    /**
     * Refreshes the page by using params of specific elements
     *
     * @param {string} mainContainerClassName - Class name of the Main-Container(s)
     * @param {int} targetContainer - Target Container of the class (starts with 0) the first (0) of them is usually the right one
     * @param {string} itemClassName - Class name of Content-Elements
     * @param {boolean} allowMouseOver - Allow use of MouseOver-Buttons here
     */
    function refreshSiteByParam(mainContainerClassName, targetContainer, itemClassName, allowMouseOver)
    {
        // Get the MainContainer
        var mainContainer = document.getElementsByClassName(mainContainerClassName);

        // Check if the class exists
        if(mainContainer.length < targetContainer)
            return;

        // Use the first occur of the class there more of these containers but the first one is the correct container
        mainContainer = mainContainer[targetContainer];

        // Create or find the existing unblock button box, then clear it out so we can rebuild it.
        var unblockButtonBox = unlockButtonContainer('whtb-unblock-box', mainContainer, 'Unblock User (On this Page):');
        var globalUnblockButtonBox = unlockButtonContainer('whtb-global-unblock-box', mainContainer, 'Unblock User (Global List):');
        // Add Buttons to global List
        createUnblockButtonListFromArray(badUserList, globalUnblockButtonBox);

        // Clear out existing block buttons from the last iteration.
        removeExistingButtons('whtb-block-button');

        // Get all items
        var items = mainContainer.getElementsByClassName(itemClassName);

        // Generate Block buttons and hide blocked user
        for(var i = 0; i < items.length; i++)
            handleItem(items[i], ((allowMouseOver) ? useMouseOverButtons : false));

        // Generate the "Unblock button" list at the top. just for user on this page
        createUnblockButtonListFromArray(currentUserHiddenList, unblockButtonBox);

        // Add temp show button to box
        if(mainContainer.getElementsByClassName('whtb-button-reshow-blocked-content').length < 1)
            mainContainer.insertBefore(createShowContentButton(), mainContainer.firstChild);
    }

    // ------------------------------------------------

    // Loads settings
    loadData();

    // Now just do an initial refresh to show our optional stuff.
    refreshPage();

})();
