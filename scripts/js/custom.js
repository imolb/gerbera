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
    // get first character as upper case
    var char0 = str.charAt(0).toUpperCase();

    // replace non ASCII
    char0 = replaceWithAsciiChar(char0);

    // get ascii value of first character
    var intchar = char0.charCodeAt(0);

    // check for numbers
    if ( (intchar >= 48) && (intchar <= 57) ) {
        return '0';
    }
    // check for other characters
    if ( !((intchar >= 65) && (intchar <= 90)) ) {
        if (str.length() > 1) {
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

// Adds audio tracks to several virtual folders
// track:               String  File name to display
// album_artist:        String  Name of the album artist
// album:               String  Name of the album
// release_is_complete: Boolean true for complete releases, false if not complete
// album_values:        String  Semicolon separated list of the different categories the album belongs to
// track_values:        String  Semicolon separated list of the different categories the track belongs to
// category:            String  Name of the category (e.g. Genre, Mood or Grouping)

function addMultiTag(obj, chain, track, album_artist, album, is_release_complete, is_classical, album_values, track_values, category) {
    // Begin of chain for all sorts of categories
    var chainBegin = [chain.audio, chain['all' + category + 's']];

    if (category == 'Year') {
        // add tracks also directly below <DECADE> without the year
        addChainEnd(obj, chain, album_values, track_values, category, is_release_complete,
            chainBegin.concat(chain.decade),
            chainBegin.concat(chain.decade));

        // add <DECADE> as additional level in hierarchy
        chainBegin = chainBegin.concat(chain.decade);
    } else if (category == 'Genre') {
        // add also below groupings
        addChainEnd(obj, chain, album_values, track_values, category, is_release_complete,
            [chain.audio, chain.allGroupings, chain.albumGrouping, chain['all' + category + 's'], chain['album' + category]],
            [chain.audio, chain.allGroupings, chain.trackGrouping, chain['all' + category + 's'], chain['track' + category]]);
    } else if (category == 'Composer') {
        // split up into classical and non classical
        if (is_classical) {
            chainBegin = chainBegin.concat(chain.composerClassical);
        } else {
            chainBegin = chainBegin.concat(chain.composerNonClassical);
        }
    }
    // Default adding for all sorts of categories
    addChainEnd(obj, chain, album_values, track_values, category, is_release_complete,
        chainBegin.concat(chain['album' + category]),
        chainBegin.concat(chain['track' + category]));
}


function addChainEnd(obj, chain, album_values, track_values, category, is_release_complete, chainBeginAlbum, chainBeginTrack){

    if (album_values) {
        var value_list = album_values.split("; ");
        for (var idx=0; idx<value_list.length; idx++){

            chain['album' + category].title = value_list[idx];
            if (['Genre', 'Mood', 'Grouping'].contains(category)) {
                chain['album' + category].meta[M_GENRE] = value_list[idx];
            } else if (category == 'Composer') {
                chain['album' + category].meta[M_COMPOSER] = value_list[idx];
            }

            if (is_release_complete) {
                // .../-Albums-/<ALBUM>/
                addCdsTree(obj, chainBeginAlbum.concat(chain.allAlbums, chain.album));
                // .../-Artists-/<ARTIST>/<ALBUM>/
                addCdsTree(obj, chainBeginAlbum.concat(chain.allArtists, chain.artist, chain.album));
            } else {
                // .../-Albums-/-Incomplete Albums-/<ALBUM>/
                addCdsTree(obj, chainBeginAlbum.concat(chain.allAlbums, chain.allAlbumsIncomplete, chain.album));
                // .../-Artists-/<ARTIST>/-Incomplete Albums-/<ALBUM>/
                addCdsTree(obj, chainBeginAlbum.concat(chain.allArtists, chain.artist, chain.allAlbumsIncomplete));
            }
        }
    }

    if (track_values) {
        var value_list = track_values.split("; ");
        for (var idx=0; idx<value_list.length; idx++){
            chain['track' + category].title = value_list[idx];
            if (['Genre', 'Mood', 'Grouping'].contains(category)) {
                chain['track' + category].meta[M_GENRE] = value_list[idx];
            } else if (category == 'Composer') {
                chain['track' + category].meta[M_COMPOSER] = value_list[idx];
            }

            // .../-All Songs-/
            addCdsTree(obj, chainBeginTrack.concat(chain.allSongs));

            // .../-Artists-/<ARTIST>/-all Songs-/
            addCdsTree(obj, chainBeginTrack.concat(chain.allArtists, chain.artist, chain.allSongs));
        }
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
    var is_release_complete = (release_completeness && release_completeness == "complete");

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

    // in classical musics, the album_artist also contains the performes after the semicolon. Remove these
    var album_artist_values = album_artist.split('; ');
    album_artist = album_artist_values[0];

    var init_album = getInitChar(album);
    var init_artist = getInitChar(album_artist);

    // basic boolean information
    var is_various_artists = (album_artist == "Various Artists");
    var is_soundtrack = release_type && release_type.includes("soundtrack");

    var categories = new Array("audiobook", "comedy", "spokenword", "non-music", "audio drama");
    var is_audiobook = false;
    for (var idx = 0; idx<categories.length; idx++){
        if (release_type && release_type.includes(categories[idx]))
        {
            is_audiobook = true;
            break;
        }
    }
    var is_classical = false;
    if (album_grouping.includes('Classical') || album_genre.includes('Classical') ||
        track_grouping.includes('Classical') || track_genre.includes('Classical')) {
        is_classical = true;
    }


    // TODO: Assure, grouping is a single value

    // TODO: Discuss, how to make this const available from common.js in custom.js
    const chain = {
        audio: { title: 'Audio', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allAudio: { title: 'All Audio', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allArtists: { title: '-Artists-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allGenres: { title: '-Genres-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allMoods: { title: '-Moods-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allGroupings: { title: '-Groupings-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allCategories: { title: '-Categories-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allSoundtracks: { title: '-Soundtracks-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allCompilations: { title: '-Compilations-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allAudiobooks: { title: '-Audiobooks-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allAlbums: { title: '-Albums-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allAlbumsIncomplete: { title: '-Albums Incomplete-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allYears: { title: '-Year-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        abc: { title: abcbox(artist, 6, '-'), objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        initAlbum: { title: init_album, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        initArtist: { title: init_artist, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allComposers: { title: '-Composers-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        allSongs: { title: '-Songs-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        artist: { title: album_artist, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_ARTIST, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        album: { title: album, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_ALBUM, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        trackGenre: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        trackMood: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        trackGrouping: { title: track_grouping, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        albumGenre: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        albumMood: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        albumGrouping: { title: album_grouping, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_GENRE, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        albumYear: { title: year, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        trackYear: { title: year, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        albumComposer: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_COMPOSER, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        trackComposer: { title: {}, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_COMPOSER, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        decade: { title: decade + 's', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        album_artist: { title: album_artist, objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER_MUSIC_ALBUM, meta: {}, res: obj.res, aux: obj.aux, refID: obj.id },
        composerClassical: { title: '-Classical-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
        composerNonClassical: { title: '-Non Classical-', objectType: OBJECT_TYPE_CONTAINER, upnpclass: UPNP_CLASS_CONTAINER },
    };

    chain.artist.meta[M_ARTIST] = artist;
    chain.album.meta[M_ARTIST] = artist;
    chain.album.meta[M_ALBUMARTIST] = album_artist;
    chain.album.meta[M_GENRE] = album_grouping;
    chain.album.meta[M_DATE] = obj.meta[M_DATE];
    chain.album.meta[M_ALBUM] = album;
    chain.albumYear.meta[M_DATE] = year;
    chain.trackYear.meta[M_DATE] = year;
    //chain.decade.meta[M_DATE] = decade;
    chain.album_artist.meta[M_ALBUMARTIST] = album_artist;

    chain.trackGrouping.meta[M_GENRE] = track_grouping;
    chain.trackGrouping.title = track_grouping;
    chain.albumGrouping.meta[M_GENRE] = album_grouping;
    chain.albumGrouping.title = album_grouping;

    obj.title = track;

    if (is_various_artists)
    {
        addCdsTree(obj, [chain.audio, chain.allCategories, chain.allCompilations, chain.album]);
    } else {
           if (is_release_complete) {
                addCdsTree(obj, [chain.audio, chain.allAlbums, chain.initAlbum, chain.album]);
                addCdsTree(obj, [chain.audio, chain.allArtists, chain.initArtist, chain.artist, chain.album]);
                //addCdsTree(obj, [chain.audio, chain.allArtists, chain.abc, chain.initArtist, chain.album]);
                //if (composer) addCdsTree(obj, [chain.audio, chain.allComposers, chain.composer, chain.album]);
           } else {
                addCdsTree(obj, [chain.audio, chain.allAlbums, chain.initAlbum, chain.allAlbumsIncomplete, chain.album]);
                addCdsTree(obj, [chain.audio, chain.allArtists, chain.initArtist, chain.artist, chain.allAlbumsIncomplete, chain.album]);
                //if (composer) addCdsTree(obj, [chain.audio, chain.allComposers, chain.composer, chain.allAlbumsIncomplete, chain.album]);
           }
           addCdsTree(obj, [chain.audio, chain.allArtists, chain.initArtist, chain.artist, chain.allSongs]);
           //if (composer) addCdsTree(obj, [chain.audio, chain.allComposers, chain.composer, chain.allSongs]);
    }

    addMultiTag(obj, chain, track, album_artist, album, is_release_complete, is_classical, album_genre, track_genre, 'Genre');
    addMultiTag(obj, chain, track, album_artist, album, is_release_complete, is_classical, album_mood, track_mood, 'Mood');
    addMultiTag(obj, chain, track, album_artist, album, is_release_complete, is_classical, album_grouping, track_grouping, 'Grouping');
    addMultiTag(obj, chain, track, album_artist, album, is_release_complete, is_classical, composer, composer, 'Composer');

    if (year.length == 4) addMultiTag(obj, chain, track, album_artist, album, is_release_complete, is_classical, year, year, 'Year');

     // Categories: Audiobooks, Soundtracks
    if (is_audiobook)  addCdsTree(obj, [chain.audio, chain.allCategories, chain.allAudiobooks, chain.album]);
    if (is_soundtrack) addCdsTree(obj, [chain.audio, chain.allCategories, chain.allSoundtracks, chain.album]);
}

function addCdsTree(obj, tree) {
    addCdsObject(obj, addContainerTree(tree));
}