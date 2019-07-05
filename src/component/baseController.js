/**
 * Created by: Andrey Polyakov (andrey@polyakov.im)
 */
export default class BaseController {
    constructor(...deps) {
        this.___registerDependencies(deps);
    }

    ___registerDependencies = (dependencies = []) => {
        const params = angular.injector.$$annotate(this.constructor);
        if (dependencies.length === params.length) {
            params.forEach((param, index) => {
                this[`_${param}`] = dependencies[index];
            });
        } else {
            console.warn('[registerDependencies] not found all needed dependencies');
        }
    };
}
