# Nebo Angular Validate

Angular JS validation module. It provides simple interface for custom validations setup.

## Installation

```
bower install nebo-angular-validate --save
```

```
angular.module('app', [
  'nebo-angular-validate'
]);
```

## Usage

### Configuration 

```
angular.module('app').config(function ($validateProvider) {

  // Custom function
  function validateFamilyStatus (val) {
    return ['Not Married','Married','Divorced','Civil','Employed','Unemployed'].indexOf(val) > -1;
  }
  $validateProvider.add('familyStatus', validateFamilyStatus);
 
  // RegExp support
  var emailRegexp = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;

  $validateProvider.add('email', emailRegexp);

});
```


### UI

```
<input placeholder="First Name placeholder" name="firstName" title="firstName input title" validate="firstname" ng-model="model.firstName" required="required" class="input"/>

```

You can assign multiple validators separated by comma.

```
<input placeholder="First Name placeholder" name="firstName" title="firstName input title" validate="firstname,banlist" ng-model="model.firstName" required="required" class="input"/>
```

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## History

*19.05.16* initial publication 

## Credits

Author: Alexey Bondarenko (alexeybondarenko@me.com)

## License

MIT
