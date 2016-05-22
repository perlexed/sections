
/**
 * @class Section
 * @param {number} start
 * @param {number} end
 * @param {number} value
 **/
var Section = function(start, end, value) {
    this.start = start;
    this.end = end;
    this.value = value;
};

/**
 * @lends Section#
 */
Section.prototype = {
    start: null,
    end: null,
    value: null,

    /**
     * @returns {{start: number, end: number, value: number}}
     */
    getRawView: function() {
        return { start: this.start, end: this.end, value: this.value };
    },

    /**
     * @param {number} point
     * @returns {boolean}
     */
    hasPointInside: function(point) {
        return point > this.start && point < this.end;
    },

    /**
     * If given point is between context' section 'start' and 'end', then split context section into two
     * and return them
     *
     * @param {number} point
     * @returns {{split: boolean, sections: [Section]}}
     */
    splitByPoint: function (point) {
        if (!this.hasPointInside(point)) {
            return {
                split: false,
                sections: [this]
            };
        }

        return {
            split: true,
            sections: [
                new Section(this.start, point, this.value),
                new Section(point, this.end, this.value)
            ]
        };
    },

    /**
     * If 'start' or 'end' points are between context' section 'start' and 'end' points, then
     * split context section by given points
     *
     * @param {Section} section
     * @returns {{split: boolean, sections: [Section]}}
     */
    splitBySection: function(section) {
        var splitByStart = this.splitByPoint(section.start);
        var splitByEnd = this.splitByPoint(section.end);
        var sections;

        if (!splitByStart.split && !splitByEnd.split) {
            sections = [this];
        } else if (!splitByStart.split && splitByEnd.split) {
            sections = splitByEnd.sections;
        } else if (splitByStart.split && !splitByEnd.split) {
            sections = splitByStart.sections;
        } else {
            sections = [
                splitByStart.sections[0],
                new Section(section.start, section.end, this.value),
                splitByEnd.sections[1]
            ];
        }

        return {
            split: splitByStart.split || splitByEnd.split,
            sections: sections
        };
    },

    /**
     * Checks if 'start' of context section matches 'start' of the given section and
     * 'end' of the context section matches 'end' of the given section
     *
     * @param {Section} section
     * @returns {boolean}
     */
    isSectionEquals: function(section) {
        return section.start == this.start && section.end == this.end;
    }
};

/**
 * @param {{start: number, end: number value: number}} rawData
 * @returns {Section}
 */
Section.createFromRaw = function(rawData) {
    return new Section(rawData.start, rawData.end, rawData.value);
};

SectionModule = {

    /**
     * @param {Section} contextSection
     * @param {[Section]} sections
     */
    splitSectionsBySection: function(contextSection, sections) {
        for (var i = 0; i < sections.length; i++) {
            /** @type {Section} iteratedSection */
            var iteratedSection = sections[i];
            var iteratedSectionSplit = iteratedSection.splitBySection(contextSection);

            // If splits were made then remove splitted section and add resulted sections to the end
            if (iteratedSectionSplit.split) {
                sections.splice(i, 1);

                iteratedSectionSplit.sections.forEach(function(resultSection) {
                    sections.push(resultSection);
                });

                i--;
            }
        }
    },


    /**
     * Get indices of all entries of 'section' in the 'subjectSections' array
     *
     * @param {Section} section
     * @param {[Section]} subjectSections
     */
    getDuplicateIndices: function(section, subjectSections) {
        var indices = [];
        for (var i = 0; i < subjectSections.length; i++) {
            if (section.isSectionEquals(subjectSections[i])) {
                indices.push(i);
            }
        }
        return indices;
    },


    /**
     * Sum identical sections and remove duplicated
     *
     * @param {[Section]} sections
     */
    sumDuplicateSections: function(sections) {
        var contextSection;
        var sectionIndices;

        for (var i = 0; i < sections.length; i++) {
            if (!sections[i]) {
                continue;
            }
            contextSection = sections[i];
            sectionIndices = SectionModule.getDuplicateIndices(contextSection, sections);

            // Sum values if there are duplicates
            if (sectionIndices.length > 1) {
                for (var j = sectionIndices.length - 1; j > 0; j--) {
                    contextSection.value += sections[sectionIndices[j]].value;
                    sections.splice(sectionIndices[j], 1);
                }
            }
        }
    },


    /**
     * Merge all adjacent sections with the same value
     *
     * @param {[Section]} sections
     */
    mergeSections: function(sections) {
        var currentSection;
        var previousSection;

        for (var i = sections.length - 1; i > 0; i--) {
            currentSection = sections[i];
            previousSection = sections[i - 1];

            if (currentSection.start == previousSection.end && currentSection.value == previousSection.value) {
                sections[i - 1] = new Section(previousSection.start, currentSection.end, currentSection.value);
                sections.splice(i, 1);
                i--;
            }
        }
    },


    /**
     * Main entry point. Accepts array of values as described in the task
     *
     * @param {[{ start: number, end: number, value: number }]} sectionsRaw
     * @returns {[{ start: number, end: number, value: number }]}
     */
    processRawSections: function(sectionsRaw) {

        // Convert raw data to an array of Sections
        var sections = [];
        sectionsRaw.forEach(function(rawSection) {
            sections.push(Section.createFromRaw(rawSection));
        });

        var neutralCount = 0;
        var unsplittedSectionsCount;
        var contextSection;
        var restSections;

        // Firstly we need to process given array of sections in such way
        // that the resulting array wouldn't have any intersection sections
        //
        // Consider the section 'neutral' if it doesn't intersect any other sections. This way, we pick first section
        // and try to split by it other sections. If no splits were made by this action, consider section 'neutral' and
        // move it to the end of the array
        //
        // When all the sections of the array are 'neutral', we consider splitting completed
        while (neutralCount != sections.length) {

            // Save sections count
            unsplittedSectionsCount = sections.length;

            // Pick first section
            contextSection = sections[0];

            // Get rest sections
            restSections = sections.slice(1);

            SectionModule.splitSectionsBySection(contextSection, restSections);

            restSections.push(contextSection);
            sections = restSections;

            // If no splits were made, then consider this section 'neutral
            neutralCount = unsplittedSectionsCount = sections.length ? neutralCount + 1 : 0;
        }

        // Sum values of the identical sections
        SectionModule.sumDuplicateSections(sections);

        // Sort sections
        sections.sort(function(section1, section2) {
            if (section1.start == section2.start) {
                return section1.end - section2.end;
            } else {
                return section1.start - section2.start;
            }
        });

        // Merge adjacent sections
        SectionModule.mergeSections(sections);

        // Convert sections to an array of objects to match task's view
        var rawResults = [];
        sections.forEach(function(section) {
            rawResults.push(section.getRawView());
        });

        return rawResults;
    }

};

var input = [{
    start       : 1,
    end         : 2,

    value       : 1
}, {
    start       : 2,
    end         : 3,

    value       : 1
}];

console.log(SectionModule.processRawSections(input));
