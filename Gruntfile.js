module.exports = function(grunt) {

  grunt.initConfig({
    jasmine: {
      all: {
        src: 'navigatorade.js',
        options: {
          specs: 'spec/*_spec.js'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jasmine');
};
