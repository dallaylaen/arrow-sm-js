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

    /**
     *  @typedef {String|Number|Boolean} ArrowSM~ValidState
     *  @desc
     *  ArrowSM states may be strings, numbers, or booleans.
     *  As of current, no distinction between a value and its string
     *      representation is made, so be careful.
     */
    /**
     *  @callback ArrowSM~Decider
     *  @param {*} event
     *  @param {ArrowSM~ValidState} oldState
     *  @returns {ArrowSM~ValidState} newState
     *  @desc
     *  A callback that chooses the next state.
     */
    /**
     *  @callback ArrowSM~Transition
     *  @param {*} event
     *  @param {ArrowSM~ValidState} oldState
     *  @param {ArrowSM~ValidState} newState
     *  A callback that executes upon switching the state.
     *  Return value is ignored.
     */
    /**
     *  @public
     *  @class ArrowSM
     *  @classdesc
     *  Arrow SM is a finite state machine implementation in javascript.
     *
     *  @param {Object} [dsl] State transition map (see addState)
     *
     *  @example
     *  const toggle = new ArrowSM({
     *      true:  _ => false,
     *      false: _ => true,
     *  })
     *  .on( 'enter', true, _ => console.log('Switched on!'))
     *  .initialState(false)
     *  .start();
     *  toggle(); // false
     *  toggle('click me'); // undefined + console.log
     *  toggle(); // true now
     *
     */
    function ArrowSM(dsl = {}) {
        const where = ' in ArrowSM defined at '+stackFrame(1);
        const blame = msg => { throw new Error(msg+where); };

        this.states = {};
        const stages = ['decide', 'leave', 'enter'];
        let defaultState;

        /**
         *  @memberOf ArrowSM
         *  @returns {ArrowSM} this, chainable
         *  @param {String|Number|Boolean} name
         *  @param {Object} [spec]
         *  @param {ArrowSM~Decider} [spec.decide] Receives event and old state,
            returns new state or <tt>undefined</tt> if no transition is needed
         *  @param {ArrowSM~Transition} [spec.enter] Executed upon entering the state.
         *  Receives event, oldState, and newState.
         *  Return value is ignored
         *  @param {ArrowSM~Transition} [spec.leav] Executed upon leaving the state.
         *  Receives event, oldState, and newState.
         *  Return value is ignored
         *  @throws Throws if state is duplicate or spec is wrong
         *  @desc
         *  Add a new state to the machine.
         */
        this.addState = function(name, spec={}) {
            // TODO validate input
            if (typeof spec === 'function')
                spec = { decide: spec };

            if (this.states[name])
                blame('Attempt to redefine state '+name);

            if (spec.default) {
                if (defaultState !== undefined)
                    blame('Attempt to set multiple default states: '+defaultState+' and '+name);
                defaultState = name;
            }

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

        this.initialState = function(name) {
            if( !this.states[name] )
                blame('Attempt to set nonexistent state as initial: '+name);
            defaultState = name;
            return this;
        };

        this.start = function(initialState, initialTarget) {
            const spec = this;
            if( initialState === undefined ) {
                if (defaultState === undefined )
                    blame('No initial state was given');
                initialState = defaultState;
            }
            if( !spec.states[initialState] )
                blame('Illegal initial state '+initialState);

            let state;

            /* Here and below: target = copy of `this`;
             *     cbarg = [ event, fromState, toState ] */
            const setState = function(target, cbarg) {
                const entry = spec.states[cbarg[2]];
                if (entry === undefined)
                    blame('Illegal state change '+state+'->'+cbarg[2]);

                if (state !== undefined && spec.states[state].leave)
                    spec.states[state].leave.apply(target, cbarg)
                // TODO transition callback
                if (entry.enter)
                    entry.enter.apply(target, cbarg);
                if (spec.switch)
                    spec.switch.apply(target, cbarg);
                state = cbarg[2];
            };

            const decide = function(target, arg) {
                const cbarg = [arg, state, undefined];
                if (spec.decide)
                    cbarg[2] = spec.decide.apply(target, cbarg);
                if (cbarg[2] === undefined) {
                    const todo = spec.states[state].decide;
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
