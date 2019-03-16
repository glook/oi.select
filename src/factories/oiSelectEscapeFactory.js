/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */

export default function () {
    var rEscapableCharacters = /[-\/\\^$*+?.()|[\]{}]/g;  // cache escape + match String
    var sEscapeMatch = '\\$&';

    return function(string) {
        return String(string).replace(rEscapableCharacters, sEscapeMatch);
    };
}
