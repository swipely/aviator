module.exports = function(grunt) {

  grunt.initConfig({
    watch: {
      jasmine: {
        files:    [ 'aviator.js', 'spec/*_spec.js' ],
        tasks:    [ 'jasmine:all' ],
        options:  { interrupt: true }
      },
      browserify: {
        files:    [ 'src/**/*.js' ],
        tasks:    [ 'browserify:aviator' ],
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
    },

    browserify: {
      aviator: {
        src:  'src/main.js',
        dest: 'aviator.js'
      }
    }
  });

  grunt.registerTask('build', ['browserify']);
  grunt.registerTask('test', ['build', 'jasmine']);

  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
};
