'use strict';

(function(window){
    /* Determine n-th caller up the stack */
    /* Inspired by Perl's Carp module */
    function stackFrame(n) {
        /* a terrible rex that basically searches for file.js:nnn:nnn several times*/
        const in_stack = /([^:\s]+:\d+(?::\d+)?)\W*(\n|$)/g;
        const stack = new Error().stack;
        /* skip n frames */
        for (;n-->=0;)
            if (!in_stack.exec(stack))
                return undefined;
        return (in_stack.exec(stack) || [])[1];
    }

    /* constructor */
    function ArrowSM(dsl = {}) {
        const where = ' in ArrowSM defined at '+stackFrame(1);
        const blame = msg => { throw new Error(msg+where); };

        this.states = {};
        const callback = ['decide', 'leave', 'enter'];

        this.addState = function(name, spec={}) {
            // TODO validate input
            if (typeof spec === 'function')
                spec = { decide: spec };

            if (this.states[name])
                blame('Attempt to redefine state '+name);
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
                blame('Illegal initial state '+initial);

            let state;
            const setState = function(newstate, arg) {
                const spec = me.states[newstate];
                if (spec === undefined)
                    blame('Illegal state change '+state+'->'+newstate);

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
                if (arguments.length === 0)
                    return state;
                let next;
                if (me.decide)
                    next = me.decide.apply(this, [arg, state]);
                if (next === undefined) {
                    const decide = me.states[state].decide;
                    if (decide !== undefined)
                        next = decide.apply(this, [arg, state]);
                }
                if (next !== undefined)
                    setState.apply(this, [next, arg]);
            };

            Object.defineProperty( runner, 'state', {
                enumerable: true,
                get: () => state
            });

            setState(initial);
            return runner;
        };
    }

    if (typeof module !== 'undefined' && module && typeof module.exports !== 'undefined' ) {
        module.exports = ArrowSM;
    } else {
        window.ArrowSM = ArrowSM;
    }
})(this);
