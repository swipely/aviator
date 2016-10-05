module.exports = function(grunt) {

  grunt.initConfig({
    watch: {
      jasmine: {
        files:    [ 'aviator.js', 'spec/*_spec.js' ],
        tasks:    [ 'jasmine:all' ],
        options:  { interrupt: true }
      }
    },

    jasmine: {
      all: {
        src: 'aviator.js',
        options: {
          specs: 'spec/*_spec.js'
        }
      }
    }
  });

  grunt.registerTask('test', ['build', 'jasmine']);

  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-watch');
};
