'use strict';

const ArrowSM = (function(){
    /* constructor */
    function ArrowSM(dsl = {}) {
        // TODO append origin of 'this'
        this.throw = msg => { throw new Error(msg); };

        this.states = {};
        const callback = ['decide', 'leave', 'enter'];

        this.addState = function(name, spec) {
            // TODO validate input
            if (typeof spec === 'function')
                spec = { decide: spec };

            if (this.states[name])
                this.throw('Attempt to redefined state '+name);
            this.states[name] = {};

            for( let i of callback )
                this.states[name][i] = spec[i];

            return this;
        };

        for( let name in dsl ) {
            this.addState( name, dsl[name] );
        }

        this.onSwitch = function(cb) {
            // TODO validate input
            this.switch = cb;
            return this;
        };
        this.onDecide = function(cb) {
            // TODO validate input
            this.decide = cb;
            return this;
        };

        const me = this; // returns bindable function, so close over this
        this.start = function(initial) {
            if( initial === undefined || !me.states[initial])
                me.throw('Illegal initial state '+initial);

            let state;
            const setState = function(newstate, arg) {
                if (newstate === undefined)
                    return;
                const spec = me.states[newstate];
                if (spec === undefined)
                    me.throw('Illegal state change '+state+'->'+newstate);

                const cbarg = [arg, state, newstate];
                if (state !== undefined && me.states[state].leave)
                    me.states[state].leave.apply(this, cbarg)
                // TODO transition callback
                if (spec.enter)
                    spec.enter.apply(this, cbarg);
                if (me.switch)
                    me.switch.apply(this, cbarg);
                state = newstate;
            };

            const runner = function(arg) {
                if (arguments.length == 0)
                    return state;
                let next;
                if (me.decide)
                    next = me.decide.apply(this, [arg, state]);
                if (next === undefined) {
                    const decide = me.states[state].decide;
                    if (decide !== undefined)
                        next = decide.apply(this, [arg, state]);
                }
                if (Array.isArray(next)) {
                    setState.apply(this, [next[0], arg]);
                    return next[1];
                } else {
                    setState.apply(this, [next, arg]);
                }
            };

            Object.defineProperty( runner, 'state', {
                enumerable: true,
                get: () => state
            });

            setState(initial);
            return runner;
        };
    }

    return ArrowSM;
})();

if (typeof module === 'object' && module && typeof module.exports === 'object' ) {
    // we're being exported
    module.exports = ArrowSM;
}
