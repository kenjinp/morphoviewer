
/**
 * This class describes a neuron morphology, including a soma (can be null) and the
 * sections
 */
class Morphology {

  /**
   * @param {Object} description - morphology description that comes straight from the JSON morpho file
   */
  constructor (description) {
    this._sections = description.sections
    this._soma =  Object.keys(description.soma).length === 0 ? null : description.soma
  }


  /**
   * Get the soma of the Morphology
   * @return {Object} the soma description as {radius: Number, id: Number, center: [Number, Number, Number], type: "soma"}
   */
  getSoma () {
    return this._soma
  }


  /**
   * Get the number of sections
   * @return {Number} the number of sections, not including the soma
   */
  getNumberOfSections () {
    return this._sections.length
  }


  /**
   * Get all the sections as an Array
   * @return {Array}
   */
  getAllSections () {
    return this._sections
  }


}

export { Morphology }
