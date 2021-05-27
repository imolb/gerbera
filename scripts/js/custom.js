/*GRB*
  Gerbera - https://gerbera.io/

  custom.js - this file is part of Gerbera.

  Copyright (C) 2018-2021 Gerbera Contributors

  Gerbera is free software; you can redistribute it and/or modify
  it under the terms of the GNU General Public License version 2
  as published by the Free Software Foundation.

  Gerbera is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with Gerbera.  If not, see <http://www.gnu.org/licenses/>.

  $Id$
*/

var CUSTOMDEBUG = false;

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}

// Returns the first non null string of the input parameters, default is an empty string
function selectNonNull(str1, str2) {
    var str = "";
    if (str1) {
        str = str1;
    } else {
        if (str2) {
            str = str2;
        }
    }
    return str;
}

function selectNonNullTag(obj, tag1, tag2) {
    var str1 = obj.aux[tag1];
    var str2 = obj.aux[tag2];
    return selectNonNull(str1, str2);
}

function getInitChar(str) {
    if (CUSTOMDEBUG) print('getInitChar() of ' + str);

    // get first character as upper case
    var char0 = str.charAt(0).toUpperCase();
    if (CUSTOMDEBUG) print('char0 ' + char0);

    // replace non ASCII
    char0 = replaceWithAsciiChar(char0);
    if (CUSTOMDEBUG) print('char0 ASCII' + char0);

    // get ascii value of first character
    var intchar = char0.charCodeAt(0);
    if (CUSTOMDEBUG) print('intchar0 ASCII' + intchar);

    // check for numbers
    if ( (intchar >= 48) && (intchar <= 57) ) {
        return '0';
    }
    // check for other characters
    if ( !((intchar >= 65) && (intchar <= 90)) ) {
        if (str.length > 1) {
            // consider the next character
            return getInitChar(str.substr(1));
        } else {
            return '#';
        }
    }
    return String.fromCharCode(intchar);
}


// replaceWithAsciiChar
// Replaces a character with a ASCII conform character
// Assume one character (no string) in upper case.
function replaceWithAsciiChar(character) {
    // TODO more flexible/configurable/complete solution?
    const replaceMap =  {
        'Á': 'A',
        'Ä': 'A',
        'Ā': 'A',
        'É': 'E',
        'İ': 'I',
        'Ö': 'O',
        'Ü': 'U'
    };
    if (character in replaceMap) {
        return replaceMap[character];
    } else {
        return character;
    }
}


// addAudio
// overloads internal common.js/addAudio() function
// which is calles from import.js/
function addAudioStructured(obj) {
    print('File: '+obj.location);

    // Gather data
    // Prefer "sort_order" if existing
    var album_artist = selectNonNullTag(obj, 'TSO2', 'TPE2');
    var artist       = selectNonNullTag(obj, 'TSOP', 'TPE1');
    var composer     = selectNonNullTag(obj, 'TSOC', 'TCOM');
    var track        = selectNonNullTag(obj, 'TSOT', 'TIT2');
    if (!track) track = obj.title;
    var album        = selectNonNullTag(obj, 'TSOA', 'TALB');

    var disc_number    = obj.aux['TPOS'];
    var release_date   = obj.aux['TDRC'];
    var track_number   = obj.aux['TRCK'];

    var track_genre    = obj.aux['TCON'];
    var track_mood     = obj.aux['TMOO'];
    var track_grouping = obj.aux['TIT1'];

    var album_mood     = obj.aux['TXXX:albummood'];
    var album_genre    = obj.aux['TXXX:albumgenre'];
    var album_grouping = obj.aux['TXXX:albumgrouping'];

    var compilation    = obj.aux['TCMP'];
    var release_type   = obj.aux['TXXX:MusicBrainz Album Type'];
    var release_completeness = obj.aux['TXXX:releasecompleteness'];
    var series         = obj.aux['TXXX:releasegroupseries'];

    if (CUSTOMDEBUG) print('TAGs processed');

    if (!track_grouping) track_grouping = 'Unknown';
    if (!album_grouping) album_grouping = 'Unknown';
    if (!album)          album          = 'Unknown';

    var year;
    var decade;
    if (release_date) {
        year = getYear(release_date);
        if (year) {
            decade = year.substring(0,3) + '0';
        } else {
            decade = "Unknown";
        }
    } else {
        year = "Unknown";
        decade = "Unknown";
    }

    if (CUSTOMDEBUG) {
        print('Arist: ' + artist);
        print('Albumartist: ' + album_artist);
        print('Track: ' + track);
    }

    if (CUSTOMDEBUG) print('TAG Details 1');
    // in classical musics, the album_artist also contains the performes after the semicolon. Remove these
    var album_artist_values = album_artist.split('; ');
    album_artist = album_artist_values[0];

    if (CUSTOMDEBUG) print('TAG Details 2');
    var init_album = getInitChar(album);
    var init_artist = getInitChar(album_artist);

    // basic boolean information
    if (CUSTOMDEBUG) print('TAG Details 3');
    var is_various_artists = (album_artist == "Various Artists");
    var is_soundtrack = release_type && release_type.includes("soundtrack");
    var is_release_complete = (release_completeness && release_completeness == "complete");

    if (CUSTOMDEBUG) print('TAG Details 4');
    var categories = new Array("audiobook", "comedy", "spokenword", "non-music", "audio drama");
    var is_audiobook = false;
    for (var idx = 0; idx<categories.length; idx++){
        if (release_type && release_type.includes(categories[idx]))
        {
            is_audiobook = true;
            break;
        }
    }

    if (CUSTOMDEBUG) print('TAG Details 5');
    var is_classical = false;
    if ((album_grouping && album_grouping.includes('Classical')) || (album_genre && album_genre.includes('Classical')) ||
        (track_grouping && track_grouping.includes('Classical')) || (track_genre && track_genre.includes('Classical'))) {
        is_classical = true;
    }

    if (CUSTOMDEBUG) print('booleans defined');

    const chain = {
        // Container for structuring
        audio: { title: 'Audio', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allartist: { title: '-Artists-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allgenre: { title: '-Genres-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allmood: { title: '-Moods-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allgrouping: { title: '-Groupings-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allcategorie: { title: '-Categories-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allsoundtrack: { title: '-Soundtracks-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allcompilation: { title: '-Compilations-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allaudiobook: { title: '-Audiobooks-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allalbum: { title: '-Albums-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allyear: { title: '-Year-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allcomposer: { title: '-Composers-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allsong: { title: '-Songs-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },

        // Container for second-level structure
        abc: { title: abcbox(artist, 6, '-'), objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        initalbum: { title: init_album, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        initartist: { title: init_artist, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        initcomposer: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allalbumsincomplete: { title: '-Albums Incomplete-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        composerclassical: { title: '-Classical-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        composernonclassical: { title: '-Non Classical-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },

        // Container for content with specific title
        artist: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_ARTIST, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        album: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_ALBUM, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        genre: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        mood: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        grouping: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        albumgrouping: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        trackgrouping: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        year: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        composer: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_COMPOSER, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        decade: { title: decade + 's', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        series: { title: series, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
    };

    // Set attributes for artist and album, cause these are used in all other categories
    chain.artist.title = artist;
    chain.artist.meta[M_ARTIST] = artist;

    chain.album.title = album;
    chain.album.meta[M_ARTIST] = artist;
    chain.album.meta[M_ALBUMARTIST] = album_artist;
    chain.album.meta[M_GENRE] = album_grouping;
    chain.album.meta[M_DATE] = obj.meta[M_DATE];
    chain.album.meta[M_ALBUM] = album;

    // trackgrouping and albumgrouping required, to have genre below groupings, but already defined values
    // grouping is expected to be a single value (not multi-value tag)
    chain.trackgrouping.meta[M_GENRE] = track_grouping;
    chain.trackgrouping.title = track_grouping;
    chain.albumgrouping.meta[M_GENRE] = album_grouping;
    chain.albumgrouping.title = album_grouping;

    obj.title = track;

    if (!is_various_artists) {
        addMultiTag(obj, chain, is_release_complete, is_classical, artist, artist, 'artist');
        addMultiTag(obj, chain, is_release_complete, is_classical, album, null, 'album');
    }
    addMultiTag(obj, chain, is_release_complete, is_classical, album_genre, track_genre, 'genre');
    addMultiTag(obj, chain, is_release_complete, is_classical, album_mood, track_mood, 'mood');
    addMultiTag(obj, chain, is_release_complete, is_classical, album_grouping, track_grouping, 'grouping');
    addMultiTag(obj, chain, is_release_complete, is_classical, composer, composer, 'composer');

    if (year.length == 4) addMultiTag(obj, chain, is_release_complete, is_classical, year, year, 'year');

    // Categories: Audiobooks, Soundtracks, Compilations
    if (is_various_artists) {
        var compilationChain = [chain.audio, chain.allcategorie, chain.allcompilation];
        if (!is_release_complete) compilationChain = compilationChain.concat(chain.allalbumsincomplete);
        if (series) {
            var value_list = series.split("; ");
            for (var idx=0; idx<value_list.length; idx++){
                chain.series.title = value_list[idx];
                addCdsTree(obj, compilationChain.concat(chain.series, chain.album));
            }
        } else {
            addCdsTree(obj, compilationChain.concat(chain.album));
        }
    }
    if (is_audiobook)       addCdsTree(obj, [chain.audio, chain.allcategorie, chain.allaudiobook, chain.album]);
    if (is_soundtrack)      addCdsTree(obj, [chain.audio, chain.allcategorie, chain.allsoundtrack, chain.album]);
}

// Adds audio tracks to several virtual folders
// is_release_complete: Boolean true for complete releases, false if not complete
// is_classical:        Boolean
// album_values:        String  Semicolon separated list of the different categories the album belongs to
// track_values:        String  Semicolon separated list of the different categories the track belongs to
// category:            String  Name of the category (e.g. Genre, Mood or Grouping)
function addMultiTag(obj, chain, is_release_complete, is_classical, album_values, track_values, category) {
    if (CUSTOMDEBUG) {
        print('addMultiTag(): ' + obj.title);
        print('album_values: ' + album_values);
        print('track_values: ' + track_values);
        print('category: ' + category);
    }

    // Begin of chain for all sorts of categories
    var chainBegin = [chain.audio, chain['all' + category]];

    if (category == 'year') {
        // add tracks also directly below <DECADE> without the year
        addChainEnd(obj, chain, album_values, track_values, category, is_release_complete,
            chainBegin.concat(chain.decade),
            chainBegin.concat(chain.decade));

        // add <DECADE> as additional level in hierarchy
        chainBegin = chainBegin.concat(chain.decade);
    } else if (category == 'genre') {
        // add also below groupings
        addChainEnd(obj, chain, album_values, track_values, category, is_release_complete,
            [chain.audio, chain.allgrouping, chain.albumgrouping, chain['all' + category], chain[category]],
            [chain.audio, chain.allgrouping, chain.trackgrouping, chain['all' + category], chain[category]]);
    } else if (category == 'composer') {
        // split up into classical and non classical
        if (is_classical) {
            chainBegin = chainBegin.concat(chain.composerclassical);
        } else {
            chainBegin = chainBegin.concat(chain.composernonclassical, chain.initcomposer);
        }
    } else if (category == 'artist') {
        // add sub-hierarchy with initial letter
        chainBegin = chainBegin.concat(chain.initartist);
    } else if (category == 'album') {
        // add sub-hierarchy with initial letter
        chainBegin = chainBegin.concat(chain.initalbum);
        if (!is_release_complete) chainBegin = chainBegin.concat(chain.allalbumsincomplete);
    }

    // Default adding for all sorts of categories
    addChainEnd(obj, chain, album_values, track_values, category, is_release_complete,
        chainBegin.concat(chain[category]),
        chainBegin.concat(chain[category]));
}


function addChainEnd(obj, chain, album_values, track_values, category, is_release_complete, chainBeginAlbum, chainBeginTrack){

    if (album_values) {
        var value_list = album_values.split("; ");
        for (var idx=0; idx<value_list.length; idx++){

            chain[category].title = value_list[idx];
            if (['genre', 'mood', 'grouping'].contains(category)) {
                chain[category].meta[M_GENRE] = value_list[idx];
            } else if (category == 'composer') {
                chain[category].meta[M_COMPOSER] = value_list[idx];
                chain.initcomposer.title = getInitChar(value_list[idx]);
            } else if (category == 'year') {
                chain[category].meta[M_DATE] = obj.meta[M_DATE];
            }

            if (category == 'album') {
                addCdsTree(obj, chainBeginAlbum);
            } else if (category == 'artist') {
                if (is_release_complete) addCdsTree(obj, chainBeginAlbum.concat(chain.album));
                else addCdsTree(obj, chainBeginAlbum.concat(chain.allalbumsincomplete, chain.album));
            } else {
                if (is_release_complete) {
                    // .../-Albums-/<ALBUM>/
                    addCdsTree(obj, chainBeginAlbum.concat(chain.allalbum, chain.album));
                    // .../-Artists-/<ARTIST>/<ALBUM>/
                    addCdsTree(obj, chainBeginAlbum.concat(chain.allartist, chain.artist, chain.album));
                } else {
                    // .../-Albums-/-Incomplete Albums-/<ALBUM>/
                    addCdsTree(obj, chainBeginAlbum.concat(chain.allalbum, chain.allalbumsincomplete, chain.album));
                    // .../-Artists-/<ARTIST>/-Incomplete Albums-/<ALBUM>/
                    addCdsTree(obj, chainBeginAlbum.concat(chain.allartist, chain.artist, chain.allalbumsincomplete));
                }
            }
        }
    }

    if (track_values) {
        var value_list = track_values.split("; ");
        for (var idx=0; idx<value_list.length; idx++){
            chain[category].title = value_list[idx];
            if (['genre', 'mood', 'grouping'].contains(category)) {
                chain[category].meta[M_GENRE] = value_list[idx];
            } else if (category == 'composer') {
                chain[category].meta[M_COMPOSER] = value_list[idx];
                chain.initcomposer.title = getInitChar(value_list[idx]);
            }

            // .../-All Songs-/
            addCdsTree(obj, chainBeginTrack.concat(chain.allsong));

            // .../-Artists-/<ARTIST>/-all Songs-/
            if (category != 'artist') addCdsTree(obj, chainBeginTrack.concat(chain.allartist, chain.artist, chain.allsong));
        }
    }
}

function addCdsTree(obj, tree) {
    if (CUSTOMDEBUG) {
        for (var idx = 0; idx<tree.length; idx++){
            var title = 'undefined'
            if (tree[idx]) {
                title = tree[idx].title;
            }
            print('Tree[' + idx + '] = ' + title);
        }
    }

    addCdsObject(obj, addContainerTree(tree));
}