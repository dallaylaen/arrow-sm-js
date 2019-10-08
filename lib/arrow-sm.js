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
        const stages = ['decide', 'leave', 'enter'];

        this.addState = function(name, spec={}) {
            // TODO validate input
            if (typeof spec === 'function')
                spec = { decide: spec };

            if (this.states[name])
                blame('Attempt to redefine state '+name);
            this.states[name] = {};

            for( let i of stages )
                this.states[name][i] = spec[i];

            return this;
        };

        for( let name in dsl ) {
            this.addState( name, dsl[name] );
        }

        this.on = function( when, state, callback ) {
            if (stages.indexOf(when) === -1)
                blame("Illegal trigger for on(): "+when);
            if (this.states[state] === undefined)
                blame("Illegal state name for on(): "+state);
            this.states[state][when] = callback;
            return this;
        };

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

        this.start = function(initialState, initialTarget) {
            const me = this;
            if( initialState === undefined || !me.states[initialState])
                blame('Illegal initial state '+initialState);

            let state;

            /* Here and below: target = saved this;
             *     cbarg = [ event, fromState, toState ] */
            const setState = function(target, cbarg) {
                const spec = me.states[cbarg[2]];
                if (spec === undefined)
                    blame('Illegal state change '+state+'->'+cbarg[2]);

                if (state !== undefined && me.states[state].leave)
                    me.states[state].leave.apply(target, cbarg)
                // TODO transition callback
                if (spec.enter)
                    spec.enter.apply(target, cbarg);
                if (me.switch)
                    me.switch.apply(target, cbarg);
                state = cbarg[2];
            };

            const decide = function(target, arg) {
                const cbarg = [arg, state, undefined];
                if (me.decide)
                    cbarg[2] = me.decide.apply(target, cbarg);
                if (cbarg[2] === undefined) {
                    const todo = me.states[state].decide;
                    if (todo !== undefined)
                        cbarg[2] = todo.apply(target, cbarg);
                }
                if (cbarg[2] !== undefined)
                    setState(target, cbarg);
                // TODO create a single arg array for all cbs
            };

            let queue;
            const runner = function(arg) {
                if (arguments.length === 0)
                    return state;

                const target = this;
                if (queue !== undefined) {
                    queue.push([target, arg]);
                    return;
                }

                queue = [[target, arg]];
                try {
                    while (queue.length) {
                        const task = queue.shift();
                        decide( task[0], task[1] );
                    }
                } finally {
                    queue = undefined;
                }
                return target;
            };

            setState(initialTarget, [undefined, undefined, initialState]);
            return runner;
        };
    }

    if (typeof module !== 'undefined' && module && typeof module.exports !== 'undefined' ) {
        module.exports = ArrowSM;
    } else {
        window.ArrowSM = ArrowSM;
    }
})(this);
