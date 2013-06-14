describe('Request', function () {

  var subject, navigator;

  beforeEach(function () {
    navigator = Navigatorade._navigator;
  });

  describe('namedParams', function () {
    describe('with named params', function () {
      var route = '/snap/:uuid/dawg/:section/bro';

      beforeEach(function () {
        subject = navigator.getRequest(
          '/snap/foo/dawg/bar/bro',
          null,
          route
        );
      });

      it('extracts the named params', function () {
        expect( subject.namedParams ).toEqual({
          uuid: 'foo',
          section: 'bar'
        });
      });
    });
  });

  describe('queryParams', function () {
    describe('with a query string', function () {
      var route = '/snap',
          queryString = '?bro=foo&dawg=bar&baz=boo';

      beforeEach(function () {
        subject = navigator.getRequest('/snap', queryString, route);
      });

      it('extracts the query string params', function () {
        expect( subject.queryParams ).toEqual({
          bro: 'foo',
          dawg: 'bar',
          baz: 'boo'
        });
      });
    });
  });

  describe('params', function () {
    beforeEach(function () {
      subject = navigator.getRequest('/bro/bar', '?baz=boo', '/bro/:foo');
    });

    it('is a merge of namedParams and queryParams', function () {
      expect( subject.params ).toEqual({
        foo: 'bar',
        baz: 'boo'
      });
    });
  });

});
