/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
import json from '../package.json';

export default () => {
    const full = json.version || '0.0.1';
    const [major, minor, dot] = full.split('.');
    return {
        full,
        major,
        minor,
        dot
    };
}
