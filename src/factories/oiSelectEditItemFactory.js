/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */

export default function ()  {
    return function(removedItem, lastQuery, getLabel, itemIsCorrected) {
        return itemIsCorrected ? '' : getLabel(removedItem);
    };
}
