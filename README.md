# ArrowSM

A functional finite state machine implementation in JavaScript.

# Synopsis

```javascript
    // Create a builder object to describe the machine
    const sm = new ArrowSM()

    // Declare states
        .addState( 'name', {
            decide: arg => ..., // returns the next state
            enter:  arg => ..., // side-effects upon entering the state
            leave:  arg => ..., // side-effects upon leaving the state
        })

    // Declare global callbacks
        .onDecide( arg => ... ) // type-checks & unconditional switches
        .onSwitch( (arg, from, to) => { console.log( from, '->', to, ' due to ', arg ) }

    // run the machine instance
        .start( 'initialState' )

    // if needed, attach an object with additional state
        .bind( myObject );

    // get the current state
    sm();
    sm.state; // ditto

    // switch the machine
    // this runs onDecide, decide, leave, enter, and onSwitch callbacks
    // in that order
    sm( event );
```

# Description

In Arrow, a *state* is basically a pair of (*name*, *decide(arg)*).
The *decide* function returns the name of the next state,
or `undefined` if no transition is needed,
and possibly some additional value.

The machine itself is a one-argument function with a `state` property.
The argument is passed to the *decider* of its current state.
Upon transition, the *leave*, *enter*, and *onSwitch* callbacks are called
if they were specified.

The additional value (if any) is returned to the user.

The machine can be bound to objects, resulting in `this` correctly set
in all deciders and callbacks.

`true`, `false`, and numbers are all valid states.

Multiple independent instances of the same machine can be created.

`new ArrowSM()` returns a builder object with chainable mutators
(such as `addState` and `onSwitch`)
and `start(initialState)` method that creates an actual instance.

Both `sm.state` and `sm()` (without argument) return the current state.

That's basically all.

# Callback order

All callbacks follow the same pattern
`function( trigger, oldState, newState )`.

If the SM function is bound to an object, so is any of the callbacks,

## onDecide( trigger, oldState )

`onDecide` may be used to:

* typecheck the event;

* initiate transitions shared by multiple states
(i.e. 'reset' event that switches the machine to ground state).

If a value is returned, the `decide` is skipped.
See below for return type.

## oldState.decide( trigger, oldState )

`decide` (also called `process` in other reactive FSM implementations)
is the central point of the SM.
It receives the event(trigger, argument) and returns the new state
as one of:

* `undefined` - no transition is needed, return immediately;

* `nextState` - the name of the state to switch to;

* `[ nextState, returnValue ]` - a pair of values.
The first one is one of the above, whereas the second is returned
by the SM instance after all callbacks have finished.

## oldState.leave( trigger, oldState, newState )

`leave` is called upon transition from a state.
Return value is ignored.

## newState.enter( trigger, oldState, newState )

`enter` is called immediately upon entering the state.
Return value is ignored.

## onSwitch( trigger, oldState, newState )

`onSwitch` is a final transition stage common to all states, e.g.

    sm.onSwitch( (event, from, to) => console.log('DEBUG transition '+from+'->'+to) )

Only after this last callback, the state is updated.
Exception in any of the above functions interrupts the transition
and is thrown back to the user.

