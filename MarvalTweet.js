/// <reference path="~/RFP/Assets/Scripts/MarvalSoftware/MarvalSoftware.js"/>
/// <reference path="~/RFP/Assets/Scripts/MarvalSoftware/UI/Controls/Widgets/TileWidget.js"/>
/// <reference path="~/RFP/Assets/Scripts/MarvalSoftware/UI/Dom/Dom.js"/>

MarvalSoftware.registerNamespace("MarvalSoftware.Widgets");

MarvalSoftware.Widgets.MarvalTweet = MarvalSoftware.UI.Controls.Widgets.TileWidget.extend({
    _scriptMethodProxy: null,
    _chart: null,
    _callbackName: null,
    _sinceId: null,
    init: function () {
        /// <summary>
        /// Initialises a new instance of the MarvalTweet class.
        /// </summary>

        MarvalSoftware.UI.Controls.Widgets.TileWidget.call(this, "MARVAL_TWEET", null, null, 30);
        this._scriptMethodProxy = new MarvalSoftware.Net.ScriptMethodProxy(MarvalSoftware.UI.WebHelper.getApplicationPath() + "/Ajax/AjaxService.asmx");
    },
    _setupPreferences: function () {
        /// <summary>
        /// Sets up the preferences.
        /// </summary>

        MarvalSoftware.UI.Controls.Widgets.TileWidget.prototype._setupPreferences.call(this);
        this._createPreference(
            "screenName",
            this._services.resource.getString("SCREEN_NAME"),
            "marvalgroup",
            MarvalSoftware.UI.Controls.Widgets.TileWidget.Preferences.Controls.TextInput,
            null,
            [
                new MarvalSoftware.UI.Controls.Widgets.TileWidget.Preferences.Validators.RequiredField(this._services.resource.getString("REQUIRED_SCREEN_NAME"))
            ]
        );
    },
    _setupStyles: function () {
        /// <summary>
        /// Sets up the styles.
        /// </summary>

        MarvalSoftware.UI.Controls.Widgets.TileWidget.prototype._setupStyles.call(this);
        this._styles.contentElement.padding = "0";
        MarvalSoftware.augment(this._styles, {
            tweetElement: { padding: "10px" },
            innerTweetElement: { paddingLeft: "58px", minHeight: "48px", backgroundRepeat: "no-repeat", backgroundPosition: "left top" }
        });
    },
    _savePreferences: function () {
        /// <summary>
        /// Saves preferences.
        /// </summary>

        // get the old screen name
        var oldScreenName = this._preferences["screenName"].getValue();

        // save preferences
        MarvalSoftware.UI.Controls.Widgets.TileWidget.prototype._savePreferences.call(this);

        // change colour of anchors
        MarvalSoftware.UI.Dom.setStyles.apply(null, MarvalSoftware.UI.Dom.nodeListToArray(this._contentElement.getElementsByTagName("A")).concat([{
            color: this._preferences["textColour"].getValue()
        }]));

        // refresh if screen name has changed
        if (this._preferences["screenName"].getValue() != oldScreenName) {
            this._sinceId = null;
            this._contentElement.innerHTML = "";
            this._refresh();
        }
    },
    _refresh: function () {
        /// <summary>
        /// Refreshes the tile widget.
        /// </summary>

        // get screen name
        var screenName = this._preferences["screenName"].getValue();
        if (screenName.startsWith("@")) {
            screenName = screenName.substring(1);
        }

        // abort existing get twitter user timeline request
        if (this._getTwitterUserTimelineRequest && this._getTwitterUserTimelineRequest.isExecuting) {
            this._getTwitterUserTimelineRequest.abort();
        }

        // set loading
        this._setIsLoading(true);

        // invoke get twitter user timeline
        this._getTwitterUserTimelineRequest = this._scriptMethodProxy.invoke(
            "GetTwitterUserTimeline",
            { screenName: screenName },
            MarvalSoftware.createDelegate(this._loadMarvalTweets, this),
            MarvalSoftware.createDelegate(this._handleGetTwitterUserTimelineError, this)
        );
    },
    _loadMarvalTweets: function (marvalTweets) {
        /// <summary>
        /// Loads Marval tweets.
        /// </summary>
        /// <param name="marvalTweets">The Marval tweets to load.</param>

        var marvalTweets = MarvalSoftware.Serialization.Json.deserialize(marvalTweets);
        for (var i = marvalTweets.length - 1; i >= 0; i--) {
            // process tweet text
            var text = this._linkify_tweet(marvalTweets[i]);

            // create tweet element
            var tweetElement = document.createElement("DIV");
            MarvalSoftware.UI.Dom.setStyles(tweetElement, this._styles.tweetElement);
            if (i % 2 == 0) {
                MarvalSoftware.UI.Dom.setStyles(tweetElement, { background: "url(\"" + this._services.resource.getWidgetPath("images/tweet_bg.png") + "\")" });
            }

            // create inner tweet element
            var innerTweetElement = document.createElement("DIV");
            MarvalSoftware.UI.Dom.setStyles(innerTweetElement, this._styles.innerTweetElement);
            MarvalSoftware.UI.Dom.setStyles(innerTweetElement, { backgroundImage: "url(\"" + marvalTweets[i].user.profile_image_url + "\")" });
            innerTweetElement.innerHTML = text;
            tweetElement.appendChild(innerTweetElement);

            // insert tweet element and remember the last id
            this._contentElement.insertBefore(tweetElement, this._contentElement.firstChild);
            this._sinceId = marvalTweets[i].id_str;
        }
        this._setIsLoading(false);
    },
    _linkify_tweet: function (tweet) {
        /// <summary>
        /// Linkify's a tweet.
        /// </summary>
        /// <param name="tweet">The tweet to linkify.</param>

        function escapeHTML(text) {
            return text ? text.htmlEncode() : "";
        }
        function each(arr, f) {
            for (var i = 0; i < arr.length; i++) {
                f(i, arr[i]);
            }
        }
        if (!(tweet.entities)) {
            return escapeHTML(tweet.text);
        }
        var textColour = this._preferences["textColour"].getValue();
        var index_map = {}
        each(tweet.entities.urls, function (i, entry) {
            index_map[entry.indices[0]] = [entry.indices[1], function (text) { return "<a href='" + escapeHTML(entry.url) + "' style=\"color: " + textColour + "\" noDrag=\"true\">" + escapeHTML(text) + "</a>" } ]
        });
        each(tweet.entities.hashtags, function (i, entry) {
            index_map[entry.indices[0]] = [entry.indices[1], function (text) { return "<a href='http://twitter.com/search/" + escape("#" + entry.text) + "' style=\"color: " + textColour + "\" noDrag=\"true\">" + escapeHTML(text) + "</a>" } ]
        });
        each(tweet.entities.user_mentions, function (i, entry) {
            index_map[entry.indices[0]] = [entry.indices[1], function (text) { return "<a href='http://twitter.com/" + escapeHTML(entry.screen_name) + "' style=\"color: " + textColour + "\" noDrag=\"true\">" + escapeHTML(text) + "</a>" } ]
        });
        var result = "";
        var last_i = 0;
        var i = 0;
        for (i = 0; i < tweet.text.length; ++i) {
            var ind = index_map[i];
            if (ind) {
                var end = ind[0];
                var func = ind[1];
                if (i > last_i) {
                    result += escapeHTML(tweet.text.substring(last_i, i));
                }
                result += func(tweet.text.substring(i, end));
                i = end - 1;
                last_i = end;
            }
        }
        if (i > last_i) {
            result += escapeHTML(tweet.text.substring(last_i, i));
        }
        return result;
    },
    _handleGetTwitterUserTimelineError: function () {
        /// <summary>
        /// Handles the GetTwitterUserTimeline error.
        /// </summary>

        // set not loading
        this._setIsLoading(false);
    }
});