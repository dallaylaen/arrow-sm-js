# Description

**Arrow SM** is a finite state machine implementation in JavaScript.

Each machine is represented by a single function with dual signature:

* Without arguments, it returns its current state.

* Given an argument, or _event_, it decides whether to switch to a new state.
Regardless of the decision, the current value of `this` is returned.
Communication with the outside world is done via callbacks (see below).

The machine function is bindable, so that it can be used as a (chainable) method
and/or utilize an object to maintain auxiliary state.

# How to build a machine

`new ArrowSM()` creates a machine template, or a  _builder_ object.
Its methods are mostly _mutators_ which can be chained.
Multiple independent machines with the same logic can thus be created.

`addState(stateId, functionMap)` is used to create individual states.
Each state has a unique identifier that may be a boolean, a number, or a string.
As of current, numbers/booleans are _not_ distinguished
from their string representation, so be careful.

Each state is mapped to a set of callbacks:

* `enter` is run upon entering a state;

* `decide` is run when the machine receives an event;

* `leave` is run upon leaving a state.

Additionally, two global callbacks may be defined:

* `onDecide` is executed before running the current state's `decide`;

* and `onSwitch` is executed before finalizing the transition.

Finally, `start(initialState)` method must be called
that returns a machine.

# Callback execution order

All callbacks follow the same pattern
`function( trigger, oldState, newState )`.

## onDecide( trigger, oldState )

`onDecide` is a callback shared by all states. It may be used to:

* typecheck the event;

* initiate unconditional and/or shared transitions
(i.e. 'reset' event that switches the machine to ground state).

Returns the identifier of the new state,
or `undefined` if no decision was made.

## oldState.decide( trigger, oldState )

`decide` (also called `process` in other reactive FSM implementations)
is the central point of the SM.

Returns the identifier of the new state,
or `undefined` if no transition is needed.

## oldState.leave( trigger, oldState, newState )

`leave` is called upon transition from a state.

Return value is ignored.

## newState.enter( trigger, oldState, newState )

`enter` is called immediately upon entering the state.

Return value is ignored.

## onSwitch( trigger, oldState, newState )

`onSwitch` is a final transition stage common to all states, e.g.

    sm.onSwitch( (event, from, to) => console.log('DEBUG transition '+from+'->'+to) )

Return value is ignored.

Only after this last callback, the state is updated.
Exception in any of the above functions interrupts the transition
and is thrown back to the user.

# Examples

A simplest machine can be built using a map of states and decider functions
for each state:

```javascript
    const loop = new ArrowSM({
        1: ev => 2,
        2: ev => 3,
        3: ev => 1,
    }).start(1);

    loop();       // 1
    loop('next'); // undefined
    loop();       // 2
```

A more formal definition may instead define states separately.
The builder object (as created by `new ArrowSM()`) has mostly
mutator methods that return itself and can thus be chained.

```javascript
    const complexMachine = new ArrowSM()
        .addState( 'name', {
            decide: (event, thisState) => { ... },
            enter:  (event, previousState, thisState) => { ... },
            leave:  (event, thisState, nextState) => { ... },
        })
        // ...more states here
```

Sometimes there's no need to create separate decider functions:

```javascript
    const toggle = new ArrowSM()
        .onDecide( (event, currentState) => !currentState )
        .addState(true)
        .addState(false)
        .on( 'enter', true, function () { ... } )
        .start(false);
```

Set a state by hand (most SM implementations out there seem to do that)? Easy.

```javascript
    const enum = new ArrowSM()
        .onDecide( switchTo => switchTo )
        .addState( 'open' )
        .addState( 'closed' )
        .addState( 'in progress' );
```

Ditto, but doesn't perform a loop transition if new state is the same as old:

```javascript
    const stickyEnum = new ArrowSM()
        .onDecide( (switchTo, currentState) => (switchTo === currentState) ? undefined : switchTo )
        .addState( 'open' )
        .addState( 'closed' )
        .addState( 'in progress' );
```

The above examples can be used to create a field with fixed set of values
and side effects upon switching:

```javascript
    // somewhere in constructor
    this.state = enum.start('closed');
```

# Reenterability

The Arrow machine is _synchronous_, as in it always has a definite state
and if state transition is needed, it will happen before the SM function returns.

However, transition callbacks _may_ interact with other objects,
in particular `this`, and send more events to the same machine.

In this case, all new events are queued and processed one by one.

Exception in any of the transitions will leave the machine in the last
successfully reached state, losing all the subsequent events.

Aborted transitions may still lead to inconsistent state,
and should be either avoided or checked thoroughly.

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

