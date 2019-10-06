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

* In ArrowSM, the interface to a state machine *instance*
is basically a function that receives an *argument* (also called *event*)
and produces a value.

The current state can be determined by calling the instance without arguments,
or via its read-only `state` property.

* Each instance is composed of *states*. Each state has a unique name
and maybe *decide*, *enter*, and *leave* callbacks.

The *decide* callback is crucial.
It produces the next state's name.
An `undefined` state means that no transition is needed.
A loop transition _is_ performed if new and old states are the same.

The other two manage the transition's side effects.

* Instances can be bound to objects and/or used as a method.
In such case, all the callbacks will inherit the correct `this` value.

`true`, `false`, `null`, and numbers are all valid state names.

* A `new ArrowSM()` call produces a *builder* object
that is used to declare the states, transitions, and callbacks.
Most of its methods (such as `addState` or `onSwitch`) are chainable mutators.

The `start(initialState)` method is then used to actually create an instance.
Multiple independent instances of the same machine can thus be created.

* Global `onDecide` and `onSwitch` callbacks are applied before and after
a transition, respectively.

That's basically all.

# Callback order

All callbacks follow the same pattern
`function( trigger, oldState, newState )`.
Of course `newState` is undefined unless it's determined.

If the SM function is bound to an object, so is any of the callbacks,

## onDecide( trigger, oldState )

`onDecide` is a callback shared by all states. It may be used to:

* typecheck the event;

* initiate unconditional and/or shared transitions
(i.e. 'reset' event that switches the machine to ground state).

If a value is returned, the `decide` is skipped.

## oldState.decide( trigger, oldState )

`decide` (also called `process` in other reactive FSM implementations)
is the central point of the SM.
It receives the event (aka trigger or argument) and returns the new state.

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

Return value is ignored.

# Bugs and caveats

* An ArrowSM instance may be bound to different objects, however,
all such bound instance will share the same state.
This MAY change in the future.

* New states can be added after an instance was created,
and will then affect the behavior of existing instance.
This MAY change in the future.

* Bug reports and patches welcome.

# Copyright and license

Copyright (c) 2019 Konstantin S. Uvarin `<khedin@cpan.org>`.

This program is free software available under the MIT license.

