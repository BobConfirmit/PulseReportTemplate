class PageUtil {

    /*
     * Collection of initialse page scripts.
     * Put here the code that needs to run when page loads.
     * @param {object} context object {state: state, report: report, page: page, pageContext: pageContext, log: log}
     */

    static function Initialise(context) {

        var state = context.state;
        var page = context.page;
        var pageContext = context.pageContext;

        pageContext.Items.Add('CurrentPageId', page.CurrentPageId);

        ParamUtil.Initialise(context); // initialise parameters

        // reset not bg var based filters on response rate page
        if(pageContext.Items['CurrentPageId'] === 'Response_Rate') {

            var filterFromRespondentData = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'Filters');
            var filterFromSurveyData = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'FiltersFromSurveyData');

            for(var i=0; i<filterFromSurveyData.length; i++) {
                state.Parameters['p_ScriptedFilterPanelParameter'+(filterFromRespondentData.length+i+1)] = null;
            }

        }

    }

    /*
     * Array of pages that should later be hidden (as there's nothing to show) with js by name.
     * @param {object} context object {state: state, report: report, log: log}
     * @returns {Array} pagesToHide array of page Names that should be hidden
     */

    static function getPageNamesToShow(context) {

        var log = context.log;
        var pagesToShow = [];

        var surveyProperties = DataSourceUtil.getSurveyConfig(context);

        for(var property in surveyProperties) {
            if(property.indexOf('Page_')===0) { //page config
                var isHidden = false;
                isHidden = DataSourceUtil.getPagePropertyValueFromConfig(context, property, 'isHidden');

                log.LogDebug('property='+property+'; isHidden='+isHidden)

                if(!isHidden) {
                    pagesToShow.push(TextAndParameterUtil.getTextTranslationByKey(context, property));
                }
            }
        }

        return pagesToShow;
    }

    /*
     * Indicates if page is vissble for the selected DS or not.
     * @param {object} context object {state: state, report: report, log: log}
     * @returns {Boolean}
     */

    static function isPageVisible(context) {

        var log = context.log;

        var pageContext = context.pageContext;

        try { // check if CurrentPageId doesn't exist
            var pageId = pageContext.Items['CurrentPageId'];
            return !DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'isHidden');
        } catch (e) {

            return true; // return true by default (i.e. show page)
        }

    }

    //TO DO: temporarily solution. should bу a check for each component, not for a whole page
    /*
     * Check if a page should have a toggle to switch between Chart and Table View
     * @param {object} context object {state: state, report: report, log: log, pageContext: pageContext}
     * @returns {Boolean}
     */

    static function isViewSwitchAvailable (context) {
        var log = context.log;
        var pageContext = context.pageContext;
        if (pageContext.Items['CurrentPageId'] === 'Trend')
            return true;
        return false;
    }

}