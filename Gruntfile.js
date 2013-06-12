module.exports = function(grunt) {

  grunt.initConfig({
    jasmine: {
      all: {
        src: 'navigatorade.js',
        options: {
          specs: 'spec/navigatorade_spec.js'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jasmine');
};
