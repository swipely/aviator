const Aviator = require('../index');

describe('ActionEmitter', function () {
  beforeEach(function () {
    subject = new Aviator._ActionEmitter;
  });
  describe('getExitMessage', function () {
    describe('without any messages', function () {
      it('returns undefined', function () {
        expect(subject.getExitMessage()).toBe(undefined);
      });
    });
    describe('with messages', function () {
      it('returns 1 comma separated message', function (){
        subject.on('exit', function (){ return 'foo'});
        subject.on('exit', function (){ return 'bar'});
        expect(subject.getExitMessage()).toBe('foo, bar');
      });
    });
  });
});
