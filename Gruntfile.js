module.exports = function(grunt) {

  grunt.initConfig({
    jasmine: {
      all: {
        src: 'aviator.js',
        options: {
          specs: 'spec/*_spec.js'
        }
      }
    },
    browserify: {
      aviator: {
        src:  'src/main.js',
        dest: 'aviator.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-browserify');
};
