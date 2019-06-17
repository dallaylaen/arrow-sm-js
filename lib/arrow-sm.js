'use strict';

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

    const me = this; // returns bindable function, so close over this
    this.start = function(state) {
        if( state === undefined || !me.states[state])
            me.throw('Illegal initial state '+state);

        const setState = function(newstate, arg) {
            if (newstate === undefined)
                return;
            const spec = me.states[newstate];
            if (!spec)
                me.throw('Illegal state change '+state+'->'+newstate);

            const cbarg = [state, newstate, arg];
            if (me.states[state].leave)
                me.states[state].leave.apply(this, cbarg)
            // TODO transition callback
            if (spec.enter)
                spec.enter.apply(this, cbarg);
            if (me.switch)
                me.switch.apply(this, cbarg);
            state = newstate;
        };

        const runner = function(arg) {
            const next = me.states[state].decide(arg);
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

        return runner;
    };
}

if (typeof module === 'object' && typeof module.exports === 'object' ) {
    // we're being exported
    module.exports = ArrowSM;
}
