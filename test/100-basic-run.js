
"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const ArrowSM = require( '../lib/arrow-sm.js' );

describe( 'ArrowSM', () => {
    it( 'can set up a state machine & does not share state', done => {
        const sm = new ArrowSM({
            sleep: ev => { if (ev) return 'awake' },
            awake: ev => { if (ev === 'night') return 'sleep'; }
        });

        expect( () => sm.start('none') ).to.throw(/[Ii]llegal/);
        expect( () => sm.start() ).to.throw(/[Ii]llegal/);

        const sm1 = sm.start('sleep');
        const sm2 = sm.start('sleep');

        sm1.state.should.equal('sleep');
        sm2.state.should.equal('sleep');

        sm1('get up');

        sm1.state.should.equal('awake');
        sm2.state.should.equal('sleep');

        done();
    });

    it( 'supports enter callback', done => {
        let trace = [];
        const enter = function(descr) {
            return function(...args) {
                trace.push( [descr].concat(args) );
            };
        };

        const sm = new ArrowSM()
            .addState( 1, { decide: ()=>2, enter: enter('one') } )
            .addState( 2, { decide: ev => { if(ev) return 1 }, enter: enter('two') } )
            .start(1);

        trace.should.deep.equal([['one', undefined, 1, undefined]]);

        trace = [];
        sm(0);
        trace.should.deep.equal([['two', 1, 2, 0]]);
        sm(0);
        trace.should.deep.equal([['two', 1, 2, 0]]);

        trace = [];
        sm(42);
        trace.should.deep.equal([['one', 2, 1, 42]]);

        done();
    });

    it( 'supports leave callback', done => {
        let trace = [];
        const leave = function(descr) {
            return function(...args) {
                trace.push( [descr].concat(args) );
            };
        };

        const sm = new ArrowSM()
            .addState( 1, { decide: ()=>2, leave: leave('one') } )
            .addState( 2, { decide: ev => { if(ev) return 1 }, leave: leave('two') } )
            .start(1);

        trace.should.deep.equal([]);

        sm(42);
        trace.should.deep.equal([['one', 1, 2, 42]]);

        done();
    });

    it( 'supports onSwitch', done => {
        const trace = [];
        const sm = new ArrowSM({
            1: () => 2,
            2: () => 1
        })
        .onSwitch((from, to) => trace.push(from+'->'+to))
        .start(1);

        sm();
        sm.state.should.equal(2);
        trace.should.deep.equal(['1->2']);

        done();
    });

    it( 'forbids dupe states', done => {
        const sm = new ArrowSM({ myname: () => 'myname' });

        expect( () => sm.addState( 'myname', () => 'othername' ) )
            .to.throw(/redefine.*myname/);

        done();
    });

    it( 'abandons transition on exception', done => {
        const sm = new ArrowSM({
            life: () => 'hell',
            hell: {
                decide: () => 'hell',
                enter: (o,n,e) => { if (e === 'hope') throw 'cannot enter hell with hope' }
            }
        }).start('life');

        expect( () => sm('hope') ).to.throw(/cannot enter hell/);
        sm.state.should.equal('life');

        done();
    });

    it( 'can return values', done => {
        const sm = new ArrowSM({
            odd: ev => ['even', -ev],
            even: ev => ['odd', ev]
        }).start('odd');

        expect( sm(5) ).to.equal(-5);
        expect( sm(6) ).to.equal(6);

        done();
    });

    it( 'resists faulty transitions', done => {
        const sm = new ArrowSM({ one: () => 'two' }).start('one');

        expect( () => sm() ).to.throw(/[Ii]llegal.*one->two/);
        expect( sm.state ).to.equal('one');

        done();
    });
});

