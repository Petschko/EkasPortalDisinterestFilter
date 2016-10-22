// ==UserScript==
// @name         Eka's Portal Disinterest Filter
// @namespace    http://zcxv.com/
// @version      0.5
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
     * Contains if debug is enabled
     *
     * @type {boolean} - true if debug is enabled else false
     */
    var debug = true;

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
                showHideButton.innerHTML = 'Hide';
            } else {
                hideElement.style.display = 'none';
                showHideButton.innerHTML = 'Show';
            }
        };

        return showHideButton;
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
     * Refresh OUR data on the page. (Doesn't cause an actual page request.)
     */
    function refreshPage()
    {
        logAdd('Refresh Page...');
        resetCurrentBlockUser();

        // Check the function we need to build or stuff in use the <title> content to check
        if(stringStartWith(document.title, 'g4 :: Latest Updates'))
            refreshG4LatestUpdates();

        if(stringStartWith(document.title, 'g4 :: Messages'))
            refreshG4Messages();

        if(stringStartWith(document.title, 'g4 :: Tagged'))
            refreshG4Tagged();

        if(stringStartWith(document.title, 'g4 :: Search Results'))
            refreshG4Search();
    }

    /**
     * todo doc
     */
    function refreshG4Search()
    {
        logAdd('Function: refreshG4Search()');

        // Get the MainContainer
        var mainContainer = document.getElementById('gallery-items');

        // Check if the Id exists
        if(mainContainer === null)
            return;

        // Create or find the existing unblock button box, then clear it out so we can rebuild it.
        var unblockButtonBox = unlockButtonContainer('whtb-unblock-box', mainContainer, 'Unblock User (On this Page):');
        var globalUnblockButtonBox = unlockButtonContainer('whtb-global-unblock-box', mainContainer, 'Unblock User (Global List):');
        // Add Buttons to global List
        createUnblockButtonListFromArray(badUserList, globalUnblockButtonBox);

        // Clear out existing block buttons from the last iteration.
        removeExistingButtons('whtb-block-button');

        // Get all Items
        var items = mainContainer.getElementsByClassName('gallery-item');

        // Generate Block buttons and hide blocked user
        for(var i = 0; i < items.length; i++) {
            var userLink = items[i].getElementsByClassName('user-link');

            if(userLink.length > 0) {
                // Get UserLink and Username
                userLink = userLink[0];
                var username = userLink.innerHTML;

                // Hide if user is in list
                if(badUserList.indexOf(username) != -1) {
                    items[i].style.display = 'none';

                    // Add to current block list if not in there
                    if(currentUserHiddenList.indexOf(username) == -1)
                        currentUserHiddenList.push(username);
                } else { // Show Block-Button
                    items[i].style.display = '';

                    // Add Button
                    var hideButton = createBlockButton(username, false);
                    hideButton.style.display = 'none';
                    userLink.parentElement.insertBefore(hideButton, userLink.nextSibling);

                    /**
                     * Makes Block-Button visible
                     */
                    items[i].onmouseover = function() {
                        var blockButton = this.getElementsByClassName('whtb-block-button')[0];
                        blockButton.style.display = 'inline-block';
                    };

                    /**
                     * Makes Block-Button invisible if Mouse go out
                     */
                    items[i].onmouseout = function() {
                        var blockButton = this.getElementsByClassName('whtb-block-button')[0];
                        blockButton.style.display = 'none';
                    }
                }
            }
        }

        // Generate the "Unblock button" list at the top. just for user on this page
        currentUserHiddenList.sort();
        createUnblockButtonListFromArray(currentUserHiddenList, unblockButtonBox);
    }

    /**
     * Refreshes the Tagged Site
     */
    function refreshG4Tagged()
    {
        logAdd('Function: refreshG4Tagged()');

        // Get the MainContainer
        var mainContainer = document.getElementsByClassName('gallery-items');

        // Check if the class exists
        if(mainContainer.length == 0)
            return;

        // Use the first occur of the class there more of these containers but the first one is the correct container
        mainContainer = mainContainer[0];

        // Create or find the existing unblock button box, then clear it out so we can rebuild it.
        var unblockButtonBox = unlockButtonContainer('whtb-unblock-box', mainContainer, 'Unblock User (On this Page):');
        var globalUnblockButtonBox = unlockButtonContainer('whtb-global-unblock-box', mainContainer, 'Unblock User (Global List):');
        // Add Buttons to global List
        createUnblockButtonListFromArray(badUserList, globalUnblockButtonBox);

        // Clear out existing block buttons from the last iteration.
        removeExistingButtons('whtb-block-button');

        // Get all items
        var items = mainContainer.getElementsByClassName('gallery-item');

        // Generate Block buttons and hide blocked user
        for(var i = 0; i < items.length; i++) {
            var userLink = items[i].getElementsByClassName('user-link');

            if(userLink.length > 0) {
                // Get UserLink and Username
                userLink = userLink[0];
                var username = userLink.innerHTML;

                // Hide if user is in list
                if(badUserList.indexOf(username) != -1) {
                    items[i].style.display = 'none';

                    // Add to current block list if not in there
                    if(currentUserHiddenList.indexOf(username) == -1)
                        currentUserHiddenList.push(username);
                } else { // Show Block-Button
                    items[i].style.display = '';

                    // Add Button
                    var hideButton = createBlockButton(username, false);
                    hideButton.style.display = 'none';
                    userLink.parentElement.insertBefore(hideButton, userLink.nextSibling);

                    /**
                     * Makes Block-Button visible
                     */
                    items[i].onmouseover = function() {
                        var blockButton = this.getElementsByClassName('whtb-block-button')[0];
                        blockButton.style.display = 'inline-block';
                    };

                    /**
                     * Makes Block-Button invisible if Mouse go out
                     */
                    items[i].onmouseout = function() {
                        var blockButton = this.getElementsByClassName('whtb-block-button')[0];
                        blockButton.style.display = 'none';
                    }
                }
            }
        }

        // Generate the "Unblock button" list at the top. just for user on this page
        currentUserHiddenList.sort();
        createUnblockButtonListFromArray(currentUserHiddenList, unblockButtonBox);
    }

    /**
     * Refreshes the Message Site
     */
    function refreshG4Messages()
    {
        logAdd('Function: refreshG4Messages()');

        // Get the MainContainer
        var mainContainer = document.getElementsByClassName('g-box-contents');

        // Check if the class exists
        if(mainContainer.length == 0)
            return;

        // Use the first occur of the class there more of these containers but the first one is the correct container
        mainContainer = mainContainer[0];

        // Create or find the existing unblock button box, then clear it out so we can rebuild it.
        var unblockButtonBox = unlockButtonContainer('whtb-unblock-box', mainContainer, 'Unblock User (On this Page):');
        var globalUnblockButtonBox = unlockButtonContainer('whtb-global-unblock-box', mainContainer, 'Unblock User (Global List):');
        // Add Buttons to global List
        createUnblockButtonListFromArray(badUserList, globalUnblockButtonBox);
        // todo add button 'remove items from blocked user'

        // Clear out existing block buttons from the last iteration.
        removeExistingButtons('whtb-block-button');

        // Get all Items
        var items = mainContainer.getElementsByClassName('gallery-item');

        // Generate Block buttons and hide blocked user
        for(var i = 0; i < items.length; i++) {
            var userLink = items[i].getElementsByClassName('user-link');

            if(userLink.length > 0) {
                // Get UserLink and Username
                userLink = userLink[0];
                var username = userLink.innerHTML;

                // Hide if user is in list
                if(badUserList.indexOf(username) != -1) {
                    items[i].style.display = 'none';

                    // Add to current block list if not in there
                    if(currentUserHiddenList.indexOf(username) == -1)
                        currentUserHiddenList.push(username);
                } else { // Show Block-Button
                    items[i].style.display = '';

                    // Add Button
                    var hideButton = createBlockButton(username, false);
                    hideButton.style.display = 'none';
                    userLink.parentElement.insertBefore(hideButton, userLink.nextSibling);

                    /**
                     * Makes Block-Button visible
                     */
                    items[i].onmouseover = function() {
                        var blockButton = this.getElementsByClassName('whtb-block-button')[0];
                        blockButton.style.display = 'inline-block';
                    };

                    /**
                     * Makes Block-Button invisible if Mouse go out
                     */
                    items[i].onmouseout = function() {
                        var blockButton = this.getElementsByClassName('whtb-block-button')[0];
                        blockButton.style.display = 'none';
                    }
                }
            }
        }

        // Generate the "Unblock button" list at the top. just for user on this page
        currentUserHiddenList.sort();
        createUnblockButtonListFromArray(currentUserHiddenList, unblockButtonBox);
    }

    /**
     * Refreshes the Lastest Update Site
     */
    function refreshG4LatestUpdates()
    {
        logAdd('Function: refreshG4LatestUpdates()');

        // Handle the g4/latest.php page with this.
        var mainContainer = document.getElementsByClassName('g-box-contents');

        // Check if the class exists
        if(mainContainer.length == 0)
            return;

        // Use the first occur of the class
        mainContainer = mainContainer[0];

        // Create or find the existing unblock button box, then clear it out so we can rebuild it.
        var unblockButtonBox = unlockButtonContainer('whtb-unblock-box', mainContainer, 'Unblock User (On this Page):');
        var globalUnblockButtonBox = unlockButtonContainer('whtb-global-unblock-box', mainContainer, 'Unblock User (Global List):');
        // Add Buttons to global List
        createUnblockButtonListFromArray(badUserList, globalUnblockButtonBox);

        // Clear out existing block buttons from the last iteration.
        removeExistingButtons('whtb-block-button');

        // Iterate over galley entries.
        var items = mainContainer.getElementsByClassName('detail-item');

        for(var i = 0; i < items.length; i++) {

            // We'll just assume that the first user link is the user that posted it.
            // Be careful, because this can also point to comments made by users.
            // Note: user-comments can detected by searching for <this>.parent.parent.parent(classname) == comment
            var userLink = items[i].getElementsByClassName('user-link');

            if(userLink.length > 0) {

                userLink = userLink[0];

                var username = userLink.innerHTML;

                if(badUserList.indexOf(username) != -1) {

                    // Found someone we want to block. Hide the element and add to our
                    // list of unblock buttons.
                    items[i].style.display = 'none';

                    if(currentUserHiddenList.indexOf(username) == -1)
                        currentUserHiddenList.push(username);

                } else {

                    // This user is fine, but just in case we want to block them, we
                    // better add a block button. We could also be coming in from an
                    // unblock command, so we need to reset the visibility.
                    items[i].style.display = '';

                    // Set up the block button.
                    var hideButton = createBlockButton(username, true);

                    // Stick this right next to the username.
                    userLink.parentElement.insertBefore(hideButton, userLink.nextSibling);
                }
            }
        }

        // Generate the "Unblock button" list at the top. just for user on this page
        currentUserHiddenList.sort();
        createUnblockButtonListFromArray(currentUserHiddenList, unblockButtonBox);
    }

    // ------------------------------------------------

    // Loads settings
    loadData();

    // Now just do an initial refresh to show our optional stuff.
    refreshPage();

})();
