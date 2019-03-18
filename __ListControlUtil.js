class ListControlUtil {

    /*
     * Hide list if parameter is not needed.
     * @param {object} context object {state: state, report: report, pageContext: pageContext, log: log}
     * @param {string} parameterName
     * @return {boolean}
     */

    static function hideListControl(context, parameterName) {

        var log = context.log;
        var pageContext = context.pageContext;
        var pageId = pageContext.Items['CurrentPageId'];

        if(parameterName === 'p_Results_BreakBy') {

            var breakByTimeUnits = DataSourceUtil.getPagePropertyValueFromConfig(context, 'Page_'+pageId, 'BreakByTimeUnits');
            var breakBy = DataSourceUtil.getPagePropertyValueFromConfig(context, 'Page_'+pageId, 'BreakVariables');

            if(!breakByTimeUnits && breakBy && breakBy.length > 0) {
                return false;
            } else {
                return true;
            }
        }

        if(parameterName === 'p_TimeUnitNoDefault') {

            var breakByTimeUnits = DataSourceUtil.getPagePropertyValueFromConfig(context, 'Page_'+pageId, 'BreakByTimeUnits');

            if(!breakByTimeUnits) {
                return true;
            } else {
                return false;
            }
        }

        if(parameterName === 'p_BenchmarkSet') {

            if(!DataSourceUtil.getPagePropertyValueFromConfig(context, 'Page_Results', 'BenchmarkSet')) {
                return true;
            } else {
                return false;
            }

        }

        if(parameterName === 'p_Results_TableTabSwitcher') {

            return DataSourceUtil.isProjectSelectorNeeded(context); // only needed for pulse programs
        }


    }
}