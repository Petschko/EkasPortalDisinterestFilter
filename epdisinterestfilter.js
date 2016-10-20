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
        badUserList = localStorage.getItem("whtb-blocklist");
        if(badUserList === null) {
            badUserList = "";
        }
        badUserList = badUserList.split(",");
        for(var i = 0; i < badUserList.length; i++) {
            console.log("Loaded bad user: " + badUserList[i]);
        }
    }

    /**
     * Block a user by name.
     *
     * @param {string} username - Username to block
     */
    function blockUser(username)
    {
        badUserList = badUserList.concat([username]);
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
        if(index != -1) {
            badUserList.splice(index, 1);
        }
        refreshPage();
        saveData();
    }

    /**
     * Refresh OUR data on the page. (Doesn't cause an actual page request.)
     */
    function refreshPage()
    {
        var i;
        currentUserHiddenList = [];

        // Handle the g4/latest.php page with this.
        var galleryBox = document.getElementsByClassName("g-box-contents");
        if(galleryBox.length > 0) {
            galleryBox = galleryBox[0];

            // Create or find the existing unblock button box, then clear it out so we can rebuild it.
            var unblockButtonBox = document.getElementsByClassName("whtb-unblock-box");
            if(unblockButtonBox.length === 0) {
                unblockButtonBox = document.createElement("div");
                unblockButtonBox.className = "whtb-unblock-box";
                galleryBox.insertBefore(unblockButtonBox, galleryBox.firstChild);
            } else {
                unblockButtonBox = unblockButtonBox[0];
            }
            unblockButtonBox.innerHTML = "Unblock buttons: ";

            // Clear out existing block buttons from the last iteration.
            var existingBlockButtons = document.getElementsByClassName("whtb-block-button");
            while(existingBlockButtons.length > 0) {
                existingBlockButtons[0].parentElement.removeChild(existingBlockButtons[0]);
            }

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
                        if(currentUserHiddenList.indexOf(username) == -1) {
                            currentUserHiddenList = currentUserHiddenList.concat([username]);
                        }

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

    // Now just do an initial refresh.
    refreshPage();
})();
