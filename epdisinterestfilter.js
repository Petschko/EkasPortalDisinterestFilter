// ==UserScript==
// @name         Eka's Portal Disinterest Filter
// @namespace    http://zcxv.com/
// @version      0.2
// @description  Filter out artists you don't like on Eka's Portal.
// @author       Kiri Nakatomi aka WHTB
// @match        http*://aryion.com/g4/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /**
     * Contains all users we has blocked
     *
     * @type {Array|null|string} - All blocked Users
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
        localStorage.setItem("whtb-blocklist", badUserList.join());
    }

    /**
     * Load the bad user list from local storage.
     */
    function loadData()
    {
        var loadedList = localStorage.getItem("whtb-blocklist");

        // Handle if list doesn't exists
        if(loadedList === null)
            return;

        badUserList = loadedList.split(",");

        // Show Loaded User in Log
        for(var i = 0; i < badUserList.length; i++)
            console.log("Loaded bad user: " + badUserList[i]);
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
        return haystack.toLowerCase().indexOf(needle.toLowerCase(), 0) === 0;
    }

    /**
     * Creates a UnBlock button with assigned OnClick function
     *
     * @param {string} username - Username of the UnBlock-User for this Button
     * @returns {Element} - UnBlock-Button
     */
    function createUnBlockButton(username) {
        var restoreButton = document.createElement('BUTTON');
        restoreButton.innerHTML = username;

        /**
         * Adds the unblockUser function to this Button
         */
        restoreButton.onclick = function()
        {
            if(confirm('Do you really wan\'t unblock ' + username + '?'))
                unblockUser(username);
        };

        return restoreButton;
    }

    /**
     * Creates a Block button with assigned OnClick function
     *
     * @param {string} username - Username of the Block-User for this Button
     * @returns {Element} - BlockButton
     */
    function createBlockButton(username)
    {
        var hideButton = document.createElement('BUTTON');
        hideButton.innerHTML = 'Block ' + username;
        hideButton.className = 'whtb-block-button';

        /**
         * Adds the blockUser function to this Button
         */
        hideButton.onclick = function()
        {
            if(confirm('Are you sure to block ' + username + '?'))
                blockUser(username);
        };

        return hideButton;
    }

    /**
     * Refresh OUR data on the page. (Doesn't cause an actual page request.)
     */
    function refreshPage()
    {
        resetCurrentBlockUser();

        // Check the function we need to build or stuff in use the <title> content to check
        if(stringStartWith(document.title, 'g4 :: Lastest Updates'))
            refreshG4LastestUpdates();

        // todo implement: "g4 :: Tagged", "g4 :: Messages", "g4 :: Search Results"

    }

    /**
     * Refreshes the Lastest Update Site
     */
    function refreshG4LastestUpdates()
    {
        // Handle the g4/latest.php page with this.
        var galleryBox = document.getElementsByClassName("g-box-contents");
        var i;

        if(galleryBox.length > 0) {
            galleryBox = galleryBox[0];

            // Create or find the existing unblock button box, then clear it out so we can rebuild it.
            var unblockButtonBox = document.getElementsByClassName("whtb-unblock-box");
            if(unblockButtonBox.length === 0) {
                unblockButtonBox = document.createElement("div");
                unblockButtonBox.className = "whtb-unblock-box";
                galleryBox.insertBefore(unblockButtonBox, galleryBox.firstChild);
            } else
                unblockButtonBox = unblockButtonBox[0];

            unblockButtonBox.innerHTML = "Unblock buttons: ";

            // Clear out existing block buttons from the last iteration.
            var existingBlockButtons = document.getElementsByClassName("whtb-block-button");
            while(existingBlockButtons.length > 0)
                existingBlockButtons[0].parentElement.removeChild(existingBlockButtons[0]);

            // Iterate over galley entries.
            var items = galleryBox.getElementsByClassName("detail-item");
            for(i = 0; i < items.length; i++) {

                // We'll just assume that the first user link is the user that posted it.
                // Be careful, because this can also point to comments made by users.
                var userLink = items[i].getElementsByClassName("user-link");
                if(userLink.length > 0) {
                    userLink = userLink[0];

                    var username = userLink.innerHTML;

                    if(badUserList.indexOf(username) != -1) {

                        // Found someone we want to block. Hide the element and add to our
                        // list of unblock buttons.
                        items[i].style.display = "none";
                        if(currentUserHiddenList.indexOf(username) == -1)
                            currentUserHiddenList = currentUserHiddenList.concat([username]);

                    } else {

                        // This user is fine, but just in case we want to block them, we
                        // better add a block button. We could also be coming in from an
                        // unblock command, so we need to reset the visibility.
                        items[i].style.display = "";

                        // Set up the block button.
                        var hideButton = document.createElement("BUTTON");
                        hideButton.innerHTML = "Block";
                        hideButton.className = "whtb-block-button";
                        // (This is the point where I tell everyone that function
                        // level scope is fucking pants-on-head retarded.)
                        var setupButton = function(un) {
                            hideButton.onclick = function() {
                                blockUser(un);
                            };
                        };
                        setupButton(username);

                        // Stick this right next to the username.
                        userLink.parentElement.insertBefore(hideButton, userLink.nextSibling);
                    }
                }
            }

            // Generate the "Unblock button" list at the top.
            currentUserHiddenList.sort();
            for(i = 0; i < currentUserHiddenList.length; i++) {
                var restoreButton = document.createElement("BUTTON");
                restoreButton.innerHTML = currentUserHiddenList[i];
                unblockButtonBox.appendChild(restoreButton);
                var setupUnblockButton = function(un) {
                    restoreButton.onclick = function() {
                        unblockUser(un);
                    };
                };
                setupUnblockButton(currentUserHiddenList[i]);
            }
        }
    }

    // ------------------------------------------------

    // Loads settings
    loadData();

    // Now just do an initial refresh to show our optional stuff.
    refreshPage();
})();
