# ArrowSM

A finite state machine implementation in JavaScript.

# Description

In Arrow, a *state* is basically a pair of (*name*, *decider(arg)*).
The *decider* function returns the name of the next state,
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

That's basically all.

# Synopsis

```javascript
    const jump = new ArrowSM({
        ground: twr => { if (twr > 1) return 'air' },
        air: () => 'ground'
    })
    .start('ground');

    jump.state; // ground
    jump(0.5);
    jump.state; // ground still
    jump(1.5);
    jump.state; // air
    jump(2.5);
    jump.state; // ground again
```
# Callback order

## onDecide( trigger, oldState )

`onDecide` may be used to:

* typecheck the event;

* initiate transitions shared by multiple states
(i.e. 'reset' event that switches the machine to ground state).

If a value is returned by `onDecide`, `decide` is omitted (aka short-circuit).

## oldState.decide( trigger, oldState )

`decide` is the central point of the SM.
It receives the event(trigger, argument) and returns new state.
An `undefined` return means no transition is needed.

## oldState.leave( trigger, oldState, newState )

`leave` is called upon transition from a state.

## newState.enter( trigger, oldState, newState )

`enter` is called upon entering the state.

## onSwitch( trigger, oldState, newState )

`onSwitch` is a final transition stage common to all states, e.g.

    sm.onSwitch( (from, to) => console.log('DEBUG transition '+from+'->'+to) )

Only after this last callback, the `state` property is updated.
Exception in any of the above functions interrupts the transition
and is thrown back to the user.

