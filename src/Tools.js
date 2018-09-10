
/**
* Some handy static functions to do stuff that are not strictly related to the business of the project
*/
class Tools {

  /**
   * Handy function to deal with option object we pass in argument of function.
   * Allows the return of a default value if the `optionName` is not available in
   * the `optionObj`
   * @param {Object} optionObj - the object that contain the options
   * @param {String} optionName - the name of the option desired, attribute of `optionObj`
   * @param {any} optionDefaultValue - default values to be returned in case `optionName` is not an attribute of `optionObj`
   */
  static getOption (optionObj, optionName, optionDefaultValue) {
    return (optionObj && optionName in optionObj) ? optionObj[optionName] : optionDefaultValue
  }

}

export { Tools }
